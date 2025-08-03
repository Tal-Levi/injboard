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

  // Use the specific injury and recovery dates from the player object
  const injuryDate = new Date(player.injury_date);
  const recoveryDate = player.recovery_date 
    ? new Date(player.recovery_date) 
    : new Date(); // Use current date if no recovery date

  // Calculate missed matches for this specific injury period
  const missedMatches = matches.filter(match => {
    const matchDate = new Date(match.match_date);
    // Exclude the match on the exact injury date
    return matchDate > injuryDate && matchDate <= recoveryDate;
  });

  return missedMatches.length;
} 