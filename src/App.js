import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { calculateMissedMatches } from './utils/matchesUtils';
import Admin from './Admin';
import AdminDashboard from './AdminDashboard';
import RecoveredPlayers from './RecoveredPlayers';
import Statistics from './Statistics';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function App() {
  const [players, setPlayers] = useState([]);
  const [allPlayersForStats, setAllPlayersForStats] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [missedMatchesMap, setMissedMatchesMap] = useState({});
  const playersPerPage = 10;

  useEffect(() => {
    const fetchPlayers = async () => {
      // Fetch all players for statistics
      const { data: allData, error: allError } = await supabase.from('players').select('*');
      if (allError) {
        console.error('Error fetching all players for stats:', allError);
      } else {
        setAllPlayersForStats(allData);
      }

      // Fetch only injured players for the main display table
      const { data: injuredData, error: injuredError } = await supabase.from('players').select('*').eq('status', 'injured');
      if (injuredError) {
        console.error('Error fetching injured players:', injuredError);
      } else {
        setPlayers(injuredData);

        // Calculate missed matches for each player
        const missedMatchesData = {};
        for (const player of injuredData) {
          missedMatchesData[player.id] = await calculateMissedMatches(player);
        }
        setMissedMatchesMap(missedMatchesData);
      }
    };

    fetchPlayers();
  }, []);

  // Calculate pagination
  const indexOfLastPlayer = currentPage * playersPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
  const currentPlayers = players.slice(indexOfFirstPlayer, indexOfLastPlayer);
  const totalPages = Math.ceil(players.length / playersPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const calculateInjuryDuration = (player) => {
    if (player.injury_date) {
      const injuryDate = new Date(player.injury_date);
      const today = new Date();
      const diffTime = Math.abs(today - injuryDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

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
            <p><strong>תאריך חזרה משוער:</strong> {player.recovery_date || 'טרם נקבע'}</p>
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

  // Check if logged in for admin links
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="App">
        <h1>אקסל פציעות</h1>
        <nav>
          <Link to="/">אקסל פציעות</Link> |
          <Link to="/recovered">שחקנים שהחלימו</Link> |
          <Link to="/statistics">סטטיסטיקות</Link> |
          {isLoggedIn ? (
            <>
              <Link to="/dashboard">פאנל ניהול</Link> |
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', padding: '8px 15px' }}>התנתק</button>
            </>
          ) : (
            null
          )}
        </nav>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/recovered" element={<RecoveredPlayers />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/" element={
            <div className="visitor-view">
              <h2>שחקנים פצועים כרגע</h2>
              <table className="player-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>סוג פציעה</th>
                    <th>תאריך פציעה</th>
                    <th>תאריך חזרה</th>
                    <th>משחקים שהוחמצו</th>
                    <th>הערכת מועדון</th>
                    <th>מאמר</th>
                    <th>איפה נפצע?</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPlayers.map(player => (
                    <tr key={player.id} onClick={() => setSelectedPlayer(player)} style={{ cursor: 'pointer' }}>
                      <td data-label="שם">
                        {player.photo_url ? 
                          <img src={player.photo_url} alt={player.name_hebrew} style={{ width: '30px', height: '30px', borderRadius: '50%', marginLeft: '10px' }} /> 
                          : 
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#ccc', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', marginLeft: '10px' }}>
                            {player.name_hebrew ? player.name_hebrew.charAt(0) : ''}
                          </div>
                        }
                        {player.name_hebrew}
                      </td>
                      <td data-label="סוג פציעה">{player.injury_type_hebrew}</td>
                      <td data-label="תאריך פציעה">{player.injury_date}</td>
                      <td data-label="תאריך חזרה">{player.recovery_date || 'טרם חזר'}</td>
                      <td data-label="משחקים שהוחמצו">{missedMatchesMap[player.id] || 0}</td>
                      <td data-label="הערכת מועדון">{player.club_estimation_hebrew || 'אין'}</td>
                      <td data-label="מאמר">{player.article_link ? <a href={player.article_link} target="_blank" rel="noopener noreferrer">קישור</a> : 'אין'}</td>
                      <td data-label="איפה נפצע?">{player.injury_context_hebrew || 'אין'}</td>
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
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 