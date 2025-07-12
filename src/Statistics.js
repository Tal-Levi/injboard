import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function Statistics() {
  const [allPlayersForStats, setAllPlayersForStats] = useState([]);
  const [PieComponent, setPieComponent] = useState(null);
  const [BarComponent, setBarComponent] = useState(null);

  useEffect(() => {
    // Dynamically import chart components to avoid React version conflicts
    import('react-chartjs-2').then((module) => {
      setPieComponent(() => module.Pie);
      setBarComponent(() => module.Bar);
    });

    const fetchPlayers = async () => {
      const { data: allData, error: allError } = await supabase.from('players').select('*');
      if (allError) {
        console.error('Error fetching all players for stats:', allError);
      } else {
        setAllPlayersForStats(allData);
      }
    };

    fetchPlayers();
  }, []);

  // Statistics calculations
  const getStats = () => {
    const currentYear = new Date().getFullYear();
    const playersThisYear = allPlayersForStats.filter(player =>
      player.injury_date && new Date(player.injury_date).getFullYear() === currentYear
    );
    
    const totalInjuriesThisYear = playersThisYear.length;

    const uniqueInjuredPlayers = new Set(playersThisYear.map(player => player.name_hebrew));
    const totalUniqueInjuredPlayersThisYear = uniqueInjuredPlayers.size;

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
    playersThisYear.forEach(player => {
      if (player.injury_type_hebrew) {
        injuryTypes[player.injury_type_hebrew] = (injuryTypes[player.injury_type_hebrew] || 0) + 1;
      }
    });

    const injuryLabels = Object.keys(injuryTypes);
    const injuryCounts = Object.values(injuryTypes);

    // Calculate most injured players by days
    const playerInjuryDays = {};
    playersThisYear.forEach(player => {
      if (player.injury_date && player.recovery_date) {
        const injuryDate = new Date(player.injury_date);
        const recoveryDate = new Date(player.recovery_date);
        const diffTime = Math.abs(recoveryDate - injuryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        playerInjuryDays[player.name_hebrew] = (playerInjuryDays[player.name_hebrew] || 0) + diffDays;
      }
    });

    const playerLabels = Object.keys(playerInjuryDays);
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
    playersThisYear.forEach(player => {
      if (player.injury_date) {
        const month = new Date(player.injury_date).getMonth();
        monthlyInjuries[month] += 1;
      }
    });
    const monthLabels = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    return { 
      totalInjuriesThisYear, 
      totalUniqueInjuredPlayersThisYear,
      totalInjuredDays, 
      injuryLabels, 
      injuryCounts, 
      playerLabels, 
      playerDays, 
      totalRecoveredPlayersThisYear, 
      avgRecoveryLabels, 
      avgRecoveryDays, 
      monthLabels, 
      monthlyInjuries 
    };
  };

  const { 
    totalInjuredPlayersThisYear, 
    totalInjuredDays, 
    injuryLabels, 
    injuryCounts, 
    playerLabels, 
    playerDays, 
    totalRecoveredPlayersThisYear, 
    avgRecoveryLabels, 
    avgRecoveryDays, 
    monthLabels, 
    monthlyInjuries, 
    totalInjuriesThisYear, 
    totalUniqueInjuredPlayersThisYear
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

  const barChartData = {
    labels: playerLabels,
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

  return (
    <div className="statistics-page">
      <h2>סטטיסטיקות פציעות</h2>
      <div className="statistics">
        <div className="stats-text">
          <div>
            <p><strong>סה"כ פציעות השנה:</strong> {totalInjuriesThisYear}</p>
            <p><strong>סה"כ שחקנים ייחודיים שנפצעו השנה:</strong> {totalUniqueInjuredPlayersThisYear}</p>
            <p><strong>סה"כ שחקנים שהחלימו השנה:</strong> {totalRecoveredPlayersThisYear}</p>
          </div>
          <div>
            <p><strong>סה"כ ימי פציעה מצטברים:</strong> {totalInjuredDays}</p>
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
              <BarComponent 
                data={barChartData} 
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
        </div>
      </div>
    </div>
  );
}

export default Statistics; 