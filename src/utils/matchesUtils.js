import { supabase } from '../supabaseClient';

export async function calculateMissedMatches(player) {
  // If no injury date, return 0
  if (!player.injury_date) return 0;

  // Fetch matches
  const { data: matches, error } = await supabase.from('matches').select('*');
  
  if (error) {
    console.error('Error fetching matches:', error);
    return 0;
  }

  // Fetch all injuries for this player
  const { data: playerInjuries, error: injuriesError } = await supabase
    .from('players')
    .select('*')
    .eq('name_hebrew', player.name_hebrew);

  if (injuriesError) {
    console.error('Error fetching player injuries:', injuriesError);
    return 0;
  }

  // Sort injuries by date to handle multiple injury periods
  const sortedInjuries = playerInjuries
    .filter(p => p.injury_date) // Only consider injuries with a date
    .sort((a, b) => new Date(a.injury_date) - new Date(b.injury_date));

  // Calculate missed matches across all injury periods
  let totalMissedMatches = 0;

  sortedInjuries.forEach(injuryRecord => {
    const injuryDate = new Date(injuryRecord.injury_date);
    const recoveryDate = injuryRecord.recovery_date 
      ? new Date(injuryRecord.recovery_date) 
      : new Date(); // Use current date if no recovery date

    // Calculate missed matches for this specific injury period
    const missedMatches = matches.filter(match => {
      const matchDate = new Date(match.match_date);
      return matchDate > injuryDate && matchDate <= recoveryDate;
    });

    totalMissedMatches += missedMatches.length;
  });

  return totalMissedMatches;
} 