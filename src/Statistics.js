import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function Statistics() {
  const [allPlayersForStats, setAllPlayersForStats] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [PieComponent, setPieComponent] = useState(null);
  const [BarComponent, setBarComponent] = useState(null);

  useEffect(() => {
    // Dynamically import chart components to avoid React version conflicts
    import('react-chartjs-2').then((module) => {
      setPieComponent(() => module.Pie);
      setBarComponent(() => module.Bar);
    });

    const fetchData = async () => {
      // Fetch players
      const { data: playersData, error: playersError } = await supabase.from('players').select('*');
      if (playersError) {
        console.error('Error fetching all players for stats:', playersError);
      } else {
        setAllPlayersForStats(playersData);
      }

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*');
      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
      } else {
        setAllMatches(matchesData);
      }
    };

    fetchData();
  }, []);

  // Statistics calculations
  const getStats = () => {
    const currentYear = new Date().getFullYear();
    
    // All players with status "injured" or "recovered", regardless of date
    const allInjuredPlayers = allPlayersForStats.filter(player => 
      player.status === 'injured' || player.status === 'recovered'
    );
    
    // Players injured this year (with injury_date in current year)
    const playersInjuredThisYear = allPlayersForStats.filter(player =>
      player.injury_date && new Date(player.injury_date).getFullYear() === currentYear
    );
    
    const totalInjuriesThisYear = playersInjuredThisYear.length;

    // Calculate matches missed by injured players
    const matchesMissedByInjuredPlayers = allMatches.filter(match => {
      const matchDate = new Date(match.match_date);
      
      // Find players who were injured during this match
      const missedByPlayers = allInjuredPlayers.filter(player => {
        // If player has no injury or recovery date, they didn't miss the match
        if (!player.injury_date) return false;
        
        const injuryDate = new Date(player.injury_date);
        // If recovery date exists, use it; otherwise use current date
        const recoveryDate = player.recovery_date ? new Date(player.recovery_date) : new Date();
        
        // Player missed the match if match date is between injury and recovery dates
        return matchDate >= injuryDate && matchDate <= recoveryDate;
      });
      
      return missedByPlayers.length > 0;
    });

    const totalMatchesMissedThisYear = matchesMissedByInjuredPlayers.length;

    // Calculate matches missed per player
    const playerMatchesMissed = {};
    allInjuredPlayers.forEach(player => {
      if (!player.injury_date) return;

      const injuryDate = new Date(player.injury_date);
      const recoveryDate = player.recovery_date ? new Date(player.recovery_date) : new Date();

      const missedMatches = allMatches.filter(match => {
        const matchDate = new Date(match.match_date);
        return matchDate >= injuryDate && matchDate <= recoveryDate;
      });

      playerMatchesMissed[player.name_hebrew] = missedMatches.length;
    });

    const playerLabels = Object.keys(playerMatchesMissed);
    const playerMissedMatches = Object.values(playerMatchesMissed);

    // Total unique injured players this year by name
    const uniqueInjuredPlayers = new Set(playersInjuredThisYear.map(player => player.name_hebrew));
    const totalUniqueInjuredPlayersThisYear = uniqueInjuredPlayers.size;

    // Total players with status "injured" (current injuries)
    const currentlyInjuredPlayers = allPlayersForStats.filter(player => player.status === 'injured');
    const totalCurrentlyInjuredPlayers = currentlyInjuredPlayers.length;

    const recoveredPlayersThisYear = allPlayersForStats.filter(player =>
      player.recovery_date && new Date(player.recovery_date).getFullYear() === currentYear && player.status === 'recovered'
    );
    const totalRecoveredPlayersThisYear = recoveredPlayersThisYear.length;

    let totalInjuredDays = 0;
    allPlayersForStats.forEach(player => {
      if (player.injury_date && player.recovery_date) {
        const injuryDate = new Date(player.injury_date);
        const recoveryDate = new Date(player.recovery_date);
        const diffTime = Math.abs(recoveryDate - injuryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalInjuredDays += diffDays;
      }
    });

    // Calculate most common injuries
    const injuryTypes = {};
    allInjuredPlayers.forEach(player => {
      if (player.injury_type_hebrew) {
        injuryTypes[player.injury_type_hebrew] = (injuryTypes[player.injury_type_hebrew] || 0) + 1;
      }
    });

    const injuryLabels = Object.keys(injuryTypes);
    const injuryCounts = Object.values(injuryTypes);

    // Calculate most injured players by days
    const playerInjuryDays = {};
    allPlayersForStats.forEach(player => {
      if (player.injury_date) {
        const injuryDate = new Date(player.injury_date);
        const endDate = player.recovery_date ? new Date(player.recovery_date) : new Date();
        const diffTime = Math.abs(endDate - injuryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        playerInjuryDays[player.name_hebrew] = (playerInjuryDays[player.name_hebrew] || 0) + diffDays;
      }
    });

    const playerInjuryLabels = Object.keys(playerInjuryDays);
    const playerDays = Object.values(playerInjuryDays);

    // Calculate Average Recovery Time by Injury Type
    const injuryRecoveryTimes = {};
    allPlayersForStats.forEach(player => {
      if (player.injury_type_hebrew && player.injury_date && player.recovery_date) {
        const injuryDate = new Date(player.injury_date);
        const recoveryDate = new Date(player.recovery_date);
        const diffTime = Math.abs(recoveryDate - injuryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (!injuryRecoveryTimes[player.injury_type_hebrew]) {
          injuryRecoveryTimes[player.injury_type_hebrew] = { sum: 0, count: 0 };
        }
        injuryRecoveryTimes[player.injury_type_hebrew].sum += diffDays;
        injuryRecoveryTimes[player.injury_type_hebrew].count += 1;
      }
    });
    const avgRecoveryLabels = Object.keys(injuryRecoveryTimes);
    const avgRecoveryDays = Object.values(injuryRecoveryTimes).map(item => Math.round(item.sum / item.count));

    // Calculate Injury Trends Over Months
    const monthlyInjuries = Array(12).fill(0);
    playersInjuredThisYear.forEach(player => {
      if (player.injury_date) {
        const month = new Date(player.injury_date).getMonth();
        monthlyInjuries[month] += 1;
      }
    });
    
    // Calculate Recovery Trends Over Months
    const monthlyRecoveries = Array(12).fill(0);
    recoveredPlayersThisYear.forEach(player => {
      if (player.recovery_date) {
        const month = new Date(player.recovery_date).getMonth();
        monthlyRecoveries[month] += 1;
      }
    });
    
    const monthLabels = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    return { 
      totalInjuriesThisYear, 
      totalUniqueInjuredPlayersThisYear,
      totalCurrentlyInjuredPlayers,
      totalInjuredDays, 
      injuryLabels, 
      injuryCounts, 
      playerInjuryLabels, 
      playerDays, 
      totalRecoveredPlayersThisYear, 
      avgRecoveryLabels, 
      avgRecoveryDays, 
      monthLabels, 
      monthlyInjuries,
      monthlyRecoveries,
      totalMatchesMissedThisYear,
      playerLabels,
      playerMissedMatches
    };
  };

  const { 
    totalInjuredPlayersThisYear, 
    totalInjuredDays, 
    injuryLabels, 
    injuryCounts, 
    playerInjuryLabels, 
    playerDays, 
    totalRecoveredPlayersThisYear, 
    avgRecoveryLabels, 
    avgRecoveryDays, 
    monthLabels, 
    monthlyInjuries,
    monthlyRecoveries,
    totalInjuriesThisYear, 
    totalUniqueInjuredPlayersThisYear,
    totalCurrentlyInjuredPlayers,
    totalMatchesMissedThisYear,
    playerLabels,
    playerMissedMatches
  } = getStats();

  const pieChartData = {
    labels: injuryLabels,
    datasets: [
      {
        label: 'סוגי פציעות',
        data: injuryCounts,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 159, 64, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const missedMatchesChartData = {
    labels: playerLabels,
    datasets: [
      {
        label: 'מספר משחקים שהוחמצו',
        data: playerMissedMatches,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Update chart options for missed matches chart
  const missedMatchesChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 10,
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'מספר משחקים שהוחמצו',
          color: '#333',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#333',
          font: {
            size: 10
          },
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 10
        }
      },
      y: {
        title: {
          display: true,
          text: 'שחקנים',
          color: '#333',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#333',
          font: {
            size: 10,
            family: 'Arial, sans-serif'
          },
          padding: 5,
          autoSkip: true,
          autoSkipPadding: 10
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#333',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        titleColor: 'white',
        bodyColor: 'white',
        titleFont: {
          size: 12,
          weight: 'bold'
        },
        bodyFont: {
          size: 10
        }
      }
    }
  };

  // Update bar chart data for injury days
  const barChartData = {
    labels: playerInjuryLabels,
    datasets: [
      {
        label: 'ימי פציעה',
        data: playerDays,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Update chart options for injury days chart
  const injuryDaysChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 10,
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'ימי פציעה',
          color: '#333',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#333',
          font: {
            size: 10
          },
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 10
        }
      },
      y: {
        title: {
          display: true,
          text: 'שחקנים',
          color: '#333',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#333',
          font: {
            size: 10,
            family: 'Arial, sans-serif'
          },
          padding: 5,
          autoSkip: true,
          autoSkipPadding: 10
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#333',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        titleColor: 'white',
        bodyColor: 'white',
        titleFont: {
          size: 12,
          weight: 'bold'
        },
        bodyFont: {
          size: 10
        }
      }
    }
  };

  const avgRecoveryChartData = {
    labels: avgRecoveryLabels,
    datasets: [
      {
        label: 'ימי החלמה ממוצעים',
        data: avgRecoveryDays,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const monthlyInjuryChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'פציעות לפי חודש',
        data: monthlyInjuries,
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const monthlyRecoveryChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'החלמות לפי חודש',
        data: monthlyRecoveries,
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="statistics-page">
      <h2>סטטיסטיקות פציעות</h2>
      <div className="statistics">
        <div className="stats-text">
          <div>
            <p><strong>סה"כ פציעות השנה:</strong> {totalInjuriesThisYear}</p>
            <p><strong>סה"כ שחקנים ייחודיים שנפצעו השנה:</strong> {totalUniqueInjuredPlayersThisYear}</p>
            <p><strong>סה"כ שחקנים פצועים כרגע:</strong> {totalCurrentlyInjuredPlayers}</p>
            <p><strong>סה"כ שחקנים שהחלימו השנה:</strong> {totalRecoveredPlayersThisYear}</p>
          </div>
          <div>
            <p><strong>סה"כ ימי פציעה מצטברים:</strong> {totalInjuredDays}</p>
            <p><strong>סה"כ משחקים שהוחמצו השנה:</strong> {totalMatchesMissedThisYear}</p>
          </div>
        </div>
        <div className="charts-container">
          {PieComponent && (
            <div className="chart-wrapper">
              <h3>סוגי פציעות</h3>
              <PieComponent data={pieChartData} />
            </div>
          )}
          {BarComponent && (
            <div className="chart-wrapper">
              <h3>שחקנים עם הכי הרבה ימי פציעה</h3>
              <div style={{ 
                width: '100%', 
                height: '100%', 
                position: 'relative' 
              }}>
                <BarComponent 
                  data={barChartData} 
                  options={injuryDaysChartOptions} 
                />
              </div>
            </div>
          )}
          {BarComponent && (
            <div className="chart-wrapper">
              <h3>משחקים שהוחמצו על ידי שחקנים</h3>
              <div style={{ 
                width: '100%', 
                height: '100%', 
                position: 'relative' 
              }}>
                <BarComponent 
                  data={missedMatchesChartData} 
                  options={missedMatchesChartOptions} 
                />
              </div>
            </div>
          )}
          {BarComponent && (
            <div className="chart-wrapper">
              <h3>ימי החלמה ממוצעים לפי סוג פציעה</h3>
              <BarComponent 
                data={avgRecoveryChartData} 
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }} 
              />
            </div>
          )}
          {BarComponent && (
            <div className="chart-wrapper">
              <h3>מגמות פציעות לפי חודשים</h3>
              <BarComponent 
                data={monthlyInjuryChartData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }} 
              />
            </div>
          )}
          {BarComponent && (
            <div className="chart-wrapper">
              <h3>מגמות החלמה לפי חודשים</h3>
              <BarComponent 
                data={monthlyRecoveryChartData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Statistics; 