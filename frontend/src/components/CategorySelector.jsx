import React, { useState, useEffect } from 'react';

// Emoji Mapping (weil DB keine Emojis speichern kann)
const ICON_MAP = {
  'brain': '🧠',
  'scroll': '📜',
  'globe': '🌍',
  'soccer': '⚽',
  'music': '🎵',
  'movie': '🎬',
  'science': '🔬',
  'book': '📚'
};

function CategorySelector({ gameId, onComplete }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      console.log('🔍 Versuche Kategorien zu laden...');
      const response = await fetch('http://localhost:3001/api/categories');
      console.log('📡 Response Status:', response.status);
      
      const data = await response.json();
      console.log('📦 Empfangene Daten:', data);
      
      if (data.success) {
        setCategories(data.categories);
        console.log('✅ Kategorien geladen:', data.categories.length);
      } else {
        console.error('❌ Fehler in Response:', data);
        setError('Kategorien konnten nicht geladen werden');
      }
      setLoading(false);
    } catch (error) {
      console.error('🔴 Fetch Fehler:', error);
      setError('Kategorien konnten nicht geladen werden');
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    const index = selectedCategories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      // Entfernen
      setSelectedCategories(selectedCategories.filter(c => c.id !== category.id));
    } else {
      // Hinzufügen
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newSelected = [...selectedCategories];
    [newSelected[index - 1], newSelected[index]] = [newSelected[index], newSelected[index - 1]];
    setSelectedCategories(newSelected);
  };

  const moveDown = (index) => {
    if (index === selectedCategories.length - 1) return;
    const newSelected = [...selectedCategories];
    [newSelected[index], newSelected[index + 1]] = [newSelected[index + 1], newSelected[index]];
    setSelectedCategories(newSelected);
  };

  const saveCategories = async () => {
    if (selectedCategories.length === 0) {
      setError('Bitte wähle mindestens eine Kategorie');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/games/${gameId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryIds: selectedCategories.map(c => c.id)
        })
      });

      const data = await response.json();
      if (data.success) {
        onComplete();
      } else {
        setError('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setError('Fehler beim Speichern');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Lade Kategorien...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ color: '#667eea', marginBottom: '20px' }}>
        Wähle Kategorien aus
      </h3>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Verfügbare Kategorien */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ fontSize: '1rem', color: '#666', marginBottom: '10px' }}>
          Verfügbare Kategorien:
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '10px'
        }}>
          {categories.map(category => {
            const isSelected = selectedCategories.some(c => c.id === category.id);
            return (
              <button
                key={category.id}
                onClick={() => toggleCategory(category)}
                style={{
                  padding: '15px',
                  border: isSelected ? '3px solid #667eea' : '2px solid #e0e0e0',
                  borderRadius: '10px',
                  background: isSelected ? '#f0f4ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '5px' }}>
                  {ICON_MAP[category.icon] || '❓'}
                </div>
                <div style={{ 
                  fontWeight: isSelected ? 'bold' : 'normal',
                  color: isSelected ? '#667eea' : '#333'
                }}>
                  {category.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ausgewählte Kategorien - Reihenfolge */}
      {selectedCategories.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '1rem', color: '#666', marginBottom: '10px' }}>
            Ausgewählte Reihenfolge ({selectedCategories.length}):
          </h4>
          <div className="players-list">
            {selectedCategories.map((category, index) => (
              <div key={category.id} className="player-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{ICON_MAP[category.icon] || '❓'}</span>
                  <span className="player-name">
                    {index + 1}. {category.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    style={{
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '5px',
                      background: index === 0 ? '#ccc' : '#667eea',
                      color: 'white',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === selectedCategories.length - 1}
                    style={{
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '5px',
                      background: index === selectedCategories.length - 1 ? '#ccc' : '#667eea',
                      color: 'white',
                      cursor: index === selectedCategories.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => toggleCategory(category)}
                    style={{
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '5px',
                      background: '#eb3349',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="btn btn-success"
        onClick={saveCategories}
        disabled={selectedCategories.length === 0}
      >
        {selectedCategories.length === 0 
          ? 'Wähle mindestens eine Kategorie' 
          : `Kategorien bestätigen (${selectedCategories.length})`}
      </button>
    </div>
  );
}

export default CategorySelector;