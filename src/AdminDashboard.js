import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function AdminDashboard() {
  const [players, setPlayers] = useState([]);
  const [currentInjuredCount, setCurrentInjuredCount] = useState(0);
  const [newPlayer, setNewPlayer] = useState({
    name_hebrew: '',
    photo_url: '',
    injury_type_hebrew: '',
    injury_date: '',
    recovery_date: '',
    status: '',
    article_link: '',
    club_estimation_hebrew: '' // New field
  });
  const [editingPlayer, setEditingPlayer] = useState(null); // State to hold player being edited

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from('players').select('*');
    if (error) {
      console.error('Error fetching players:', error);
    } else {
      setPlayers(data);
      const injured = data.filter(p => p.status === 'injured');
      setCurrentInjuredCount(injured.length);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingPlayer) {
      setEditingPlayer({ ...editingPlayer, [name]: value });
    } else {
      setNewPlayer({ ...newPlayer, [name]: value });
    }
  };

  const addPlayer = async () => {
    // Filter out empty fields
    const playerToAdd = { ...newPlayer };
    
    // Set empty date fields to null
    if (playerToAdd.injury_date === '') {
      playerToAdd.injury_date = null;
    }
    if (playerToAdd.recovery_date === '') {
      playerToAdd.recovery_date = null;
    }
    if (playerToAdd.article_link === '') {
      playerToAdd.article_link = null; 
    }
    if (playerToAdd.club_estimation_hebrew === '') { // Handle new field
      playerToAdd.club_estimation_hebrew = null;
    }

    // Set status to 'injured' if empty
    if (playerToAdd.status === '') {
      playerToAdd.status = 'injured';
    }

    const { data, error } = await supabase.from('players').insert([playerToAdd]).select();
    if (error) {
      console.error('Error adding player:', error);
    } else if (data && data.length > 0) {
      setPlayers([...players, data[0]]);
      setNewPlayer({
        name_hebrew: '',
        photo_url: '',
        injury_type_hebrew: '',
        injury_date: '',
        recovery_date: '',
        status: 'injured',
        article_link: '',
        club_estimation_hebrew: '' // Reset new field
      });
      fetchPlayers(); // Re-fetch to update count and ensure fresh data
    }
  };

  const updatePlayer = async () => {
    if (!editingPlayer) return;
    const playerToUpdate = { ...editingPlayer };
    
    // Set empty date fields to null
    if (playerToUpdate.injury_date === '') {
      playerToUpdate.injury_date = null;
    }
    if (playerToUpdate.recovery_date === '') {
      playerToUpdate.recovery_date = null;
    }
    if (playerToUpdate.article_link === '') {
      playerToUpdate.article_link = null; 
    }
    if (playerToUpdate.club_estimation_hebrew === '') { // Handle new field
      playerToUpdate.club_estimation_hebrew = null;
    }

    // Set status to 'injured' if empty
    if (playerToUpdate.status === '') {
      playerToUpdate.status = 'injured';
    }

    const { error } = await supabase
      .from('players')
      .update(playerToUpdate)
      .eq('id', editingPlayer.id);

    if (error) {
      console.error('Error updating player:', error);
    } else {
      setEditingPlayer(null); // Exit edit mode
      fetchPlayers(); // Re-fetch all players to update the list
    }
  };

  const deletePlayer = async (id) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) {
      console.error('Error deleting player:', error);
    } else {
      fetchPlayers(); // Re-fetch to update the list
    }
  };

  const markAsRecovered = async (player) => {
    const { error } = await supabase
      .from('players')
      .update({ status: 'recovered', recovery_date: new Date().toISOString().slice(0, 10) })
      .eq('id', player.id);
    if (error) {
      console.error('Error marking player as recovered:', error);
    } else {
      fetchPlayers();
    }
  };

  // Statistics calculations
  const getStats = () => {
    const currentYear = new Date().getFullYear();
    const playersThisYear = players.filter(player =>
      player.injury_date && new Date(player.injury_date).getFullYear() === currentYear
    );
    
    const totalInjuredPlayersThisYear = playersThisYear.length;

    let totalInjuredDays = 0;
    players.forEach(player => {
      if (player.injury_date && player.recovery_date) {
        const injuryDate = new Date(player.injury_date);
        const recoveryDate = new Date(player.recovery_date);
        const diffTime = Math.abs(recoveryDate - injuryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalInjuredDays += diffDays;
      }
    });

    return { totalInjuredPlayersThisYear, totalInjuredDays };
  };

  const { totalInjuredPlayersThisYear, totalInjuredDays } = getStats();

  return (
    <div className="AdminDashboard">
      <h2>ניהול שחקנים</h2>

      <h3>הוספה / עריכת שחקן</h3>
      <div className="player-form">
        <input
          type="text"
          name="name_hebrew"
          placeholder="שם השחקן (עברית)"
          value={editingPlayer ? editingPlayer.name_hebrew : newPlayer.name_hebrew}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="photo_url"
          placeholder="קישור לתמונה (אופציונלי)"
          value={editingPlayer ? editingPlayer.photo_url : newPlayer.photo_url}
          onChange={handleInputChange}
        />
        <select
          name="injury_type_hebrew"
          value={editingPlayer ? editingPlayer.injury_type_hebrew : newPlayer.injury_type_hebrew}
          onChange={handleInputChange}
          required
        >
          <option value="">בחר סוג פציעה</option>
          <option value="מתיחת שריר">מתיחת שריר</option>
          <option value="קרע בשריר">קרע בשריר</option>
          <option value="קרע חלקי">קרע חלקי</option>
          <option value="קרע במיניסקוס">קרע במיניסקוס</option>
          <option value="עומס בשריר">עומס בשריר</option>
          <option value="כאבים במפשעה">כאבים במפשעה</option>
          <option value="שבר בעצם">שבר בעצם</option>
          <option value="שריר החשק">שריר החשק</option>
          <option value="נקע בקרסול">נקע בקרסול</option>
          <option value="פגיעה בברך (ACL)">פגיעה בברך (ACL)</option>
          <option value="פגיעה בברך (MCL)">פגיעה בברך (MCL)</option>
          <option value="פגיעה בכתף">פגיעה בכתף</option>
          <option value="זעזוע מוח">זעזוע מוח</option>
          <option value="פגיעה במפשעה">פגיעה במפשעה</option>
          <option value="פגיעה בגב">פגיעה בגב</option>
          <option value="אחר">אחר</option>
        </select>
        <input
          placeholder="תאריך פציעה"
          className="textbox-n"
          type="text"
          onFocus={(e) => (e.target.type = 'date')}
          onBlur={(e) => (e.target.type = 'text')}
          name="injury_date"
          max={new Date().toISOString().slice(0, 10)}
          value={editingPlayer ? (editingPlayer.injury_date ? editingPlayer.injury_date.slice(0, 10) : '') : (newPlayer.injury_date || '')}
          onChange={handleInputChange}
          required
        />
        <input
          placeholder="תאריך חזרה משוער (אופציונלי)"
          className="textbox-n"
          type="text"
          onFocus={(e) => (e.target.type = 'date')}
          onBlur={(e) => (e.target.type = 'text')}
          name="recovery_date"
          value={editingPlayer ? (editingPlayer.recovery_date ? editingPlayer.recovery_date.slice(0, 10) : '') : (newPlayer.recovery_date || '')}
          onChange={handleInputChange}
        />
        {(editingPlayer && editingPlayer.recovery_date) || (!editingPlayer && newPlayer.recovery_date) ? (
          <button 
            type="button" 
            onClick={() => {
              if (editingPlayer) {
                setEditingPlayer({ ...editingPlayer, recovery_date: null });
              } else {
                setNewPlayer({ ...newPlayer, recovery_date: '' });
              }
            }}
            style={{ marginLeft: '10px' }}
          >
            נקה תאריך חזרה
          </button>
        ) : null}
        <select      
          name="status"
          value={editingPlayer ? editingPlayer.status : newPlayer.status}
          onChange={handleInputChange}
        >
          <option value="">בחר סטטוס</option>
          <option value="injured">פצוע</option>
          <option value="recovered">החלים</option>
        </select>
        <input
          type="text"
          name="article_link"
          placeholder="קישור למאמר (אופציונלי)"
          value={editingPlayer ? editingPlayer.article_link : newPlayer.article_link}
          onChange={handleInputChange}
        />
        <select
          name="club_estimation_hebrew" // New select field
          value={editingPlayer ? editingPlayer.club_estimation_hebrew : newPlayer.club_estimation_hebrew}
          onChange={handleInputChange}
        >
          <option value="">הערכת מועדון (אופציונלי)</option>
          <option value="מספר ימים">מספר ימים</option>
          <option value="שבוע">שבוע</option>
          <option value="שבועיים">שבועיים</option>
          <option value="מספר שבועות">מספר שבועות</option>
          <option value="חודש">חודש</option>
          <option value="חצי שנה">חצי שנה</option>
          <option value="לא ידוע">לא ידוע</option>
        </select>
        {editingPlayer ? (
          <div>
            <button onClick={updatePlayer}>עדכן שחקן</button>
            <button onClick={() => setEditingPlayer(null)}>ביטול</button>
          </div>
        ) : (
          <button onClick={addPlayer}>הוסף שחקן חדש</button>
        )}
      </div>

      <h3>שחקנים נוכחיים ({currentInjuredCount} פצועים)</h3>
      <table className="player-table">
        <thead>
          <tr>
            <th>שם</th>
            <th>סוג פציעה</th>
            <th>תאריך פציעה</th>
            <th>תאריך חזרה</th>
            <th>הערכת מועדון</th> {/* New table header */}
            <th>סטטוס</th>
            <th>מאמר</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id}>
              <td data-label="שם">
                {player.photo_url ? <img src={player.photo_url} alt={player.name_hebrew} style={{ width: '30px', height: '30px', borderRadius: '50%', marginLeft: '10px' }} /> : null}
                {player.name_hebrew}
              </td>
              <td data-label="סוג פציעה">{player.injury_type_hebrew}</td>
              <td data-label="תאריך פציעה">{player.injury_date}</td>
              <td data-label="תאריך חזרה">{player.recovery_date || 'טרם חזר'}</td>
              <td data-label="הערכת מועדון">{player.club_estimation_hebrew || 'אין'}</td> {/* Display new field */}
              <td data-label="סטטוס">{player.status === 'injured' ? 'פצוע' : 'החלים'}</td>
              <td data-label="מאמר">{player.article_link ? <a href={player.article_link} target="_blank" rel="noopener noreferrer">קישור</a> : 'אין'}</td>
              <td data-label="פעולות">
                <button onClick={() => setEditingPlayer(player)}>ערוך</button>
                <button onClick={() => deletePlayer(player.id)}>מחק</button>
                {player.status === 'injured' && (
                  <button onClick={() => markAsRecovered(player)}>סמן כהחלים</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard; 