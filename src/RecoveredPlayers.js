import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function RecoveredPlayers() {
  const [recoveredPlayers, setRecoveredPlayers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
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
            <th>מאמר</th>
          </tr>
        </thead>
        <tbody>
          {currentPlayers.map(player => (
            <tr key={player.id}>
              <td>
                {player.photo_url ? <img src={player.photo_url} alt={player.name_hebrew} style={{ width: '30px', height: '30px', borderRadius: '50%', marginLeft: '10px' }} /> : null}
                {player.name_hebrew}
              </td>
              <td>{player.injury_type_hebrew}</td>
              <td>{player.injury_date}</td>
              <td>{player.recovery_date || 'טרם חזר'}</td>
              <td>{player.article_link ? <a href={player.article_link} target="_blank" rel="noopener noreferrer">קישור</a> : 'אין'}</td>
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
    </div>
  );
}

export default RecoveredPlayers; 