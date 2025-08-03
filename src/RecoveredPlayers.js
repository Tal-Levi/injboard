import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { calculateMissedMatches } from './utils/matchesUtils';

function RecoveredPlayers() {
  const [recoveredPlayers, setRecoveredPlayers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState(null); // New state for modal
  const [missedMatchesMap, setMissedMatchesMap] = useState({});
  const playersPerPage = 10;

  useEffect(() => {
    const fetchRecoveredPlayers = async () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1).toISOString().slice(0, 10);
      const endOfYear = new Date(currentYear, 11, 31).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('status', 'recovered')
        .gte('recovery_date', startOfYear)
        .lte('recovery_date', endOfYear);

      if (error) {
        console.error('Error fetching recovered players:', error);
      } else {
        setRecoveredPlayers(data);

        // Calculate missed matches for each player
        const missedMatchesData = {};
        for (const player of data) {
          // Find the specific injury record for this player that is in the recovered status
          const recoveredInjury = await supabase
            .from('players')
            .select('*')
            .eq('name_hebrew', player.name_hebrew)
            .eq('status', 'recovered')
            .order('injury_date', { ascending: false })
            .limit(1)
            .single();

          if (recoveredInjury.data) {
            missedMatchesData[player.id] = await calculateMissedMatches(recoveredInjury.data);
          } else {
            missedMatchesData[player.id] = 0;
          }
        }
        setMissedMatchesMap(missedMatchesData);
      }
    };

    fetchRecoveredPlayers();
  }, []);

  // Calculate pagination
  const indexOfLastPlayer = currentPage * playersPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
  const currentPlayers = recoveredPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
  const totalPages = Math.ceil(recoveredPlayers.length / playersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // New function to calculate injury duration (copied from App.js)
  const calculateInjuryDuration = (player) => {
    if (player.injury_date && player.recovery_date) {
      const injuryDate = new Date(player.injury_date);
      const recoveryDate = new Date(player.recovery_date);
      const diffTime = Math.abs(recoveryDate - injuryDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  // PlayerModal component (copied from App.js)
  const PlayerModal = ({ player, onClose }) => {
    if (!player) return null;

    return (
      <div className="player-modal-overlay" onClick={onClose}>
        <div className="player-modal" onClick={(e) => e.stopPropagation()}>
          <button className="player-modal-close" onClick={onClose}>×</button>
          {player.photo_url && (
            <div 
              className="player-modal-image" 
              style={{ backgroundImage: `url(${player.photo_url})` }}
            />
          )}
          <div className="player-modal-details">
            <h2>{player.name_hebrew}</h2>
            <p><strong>סוג פציעה:</strong> {player.injury_type_hebrew}</p>
            <p><strong>תאריך פציעה:</strong> {player.injury_date}</p>
            <p><strong>ימי פציעה:</strong> {calculateInjuryDuration(player)} ימים</p>
            <p><strong>תאריך חזרה:</strong> {player.recovery_date || 'טרם נקבע'}</p>
            {player.injury_context_hebrew && (
              <p><strong>איפה נפצע?:</strong> {player.injury_context_hebrew}</p>
            )}
            {player.article_link && (
              <p>
                <strong>מאמר:</strong>{' '}
                <a href={player.article_link} target="_blank" rel="noopener noreferrer">
                  קישור למאמר
                </a>
              </p>
            )}
            {player.club_estimation_hebrew && (
              <p><strong>הערכת מועדון:</strong> {player.club_estimation_hebrew}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="recovered-players">
      <h2>שחקנים שהחלימו השנה</h2>
      <table className="player-table">
        <thead>
          <tr>
            <th>שם</th>
            <th>סוג פציעה</th>
            <th>תאריך פציעה</th>
            <th>תאריך חזרה</th>
            <th>משחקים שהוחמצו</th>
            <th>מאמר</th>
            <th>הערכת מועדון</th>
            <th>איפה נפצע?</th>
          </tr>
        </thead>
        <tbody>
          {currentPlayers.map(player => (
            <tr key={player.id} onClick={() => setSelectedPlayer(player)} style={{ cursor: 'pointer' }}>
              <td data-label="שם">
                {player.photo_url ? <img src={player.photo_url} alt={player.name_hebrew} style={{ width: '30px', height: '30px', borderRadius: '50%', marginLeft: '10px' }} /> : null}
                {player.name_hebrew}
              </td>
              <td data-label="סוג פציעה">{player.injury_type_hebrew}</td>
              <td data-label="תאריך פציעה">{player.injury_date}</td>
              <td data-label="תאריך חזרה">{player.recovery_date || 'טרם חזר'}</td>
              <td data-label="משחקים שהוחמצו">{missedMatchesMap[player.id] || 0}</td>
              <td data-label="מאמר">{player.article_link ? <a href={player.article_link} target="_blank" rel="noopener noreferrer">קישור</a> : 'אין'}</td>
              <td data-label="הערכת מועדון">{player.club_estimation_hebrew || 'אין'}</td> {/* Display new field */}
              <td data-label="איפה נפצע?">{player.injury_context_hebrew || 'אין'}</td> {/* Display new field */}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => paginate(index + 1)}
            style={{
              margin: '0 5px',
              padding: '5px 10px',
              backgroundColor: currentPage === index + 1 ? '#66bb6a' : '#a5d6a7',
              border: 'none',
              borderRadius: '5px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>
      {selectedPlayer && (
        <PlayerModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </div>
  );
}

export default RecoveredPlayers; 