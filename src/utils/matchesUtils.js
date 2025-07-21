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

  const injuryDate = new Date(player.injury_date);
  const recoveryDate = player.recovery_date ? new Date(player.recovery_date) : new Date();

  // Calculate missed matches
  const missedMatches = matches.filter(match => {
    const matchDate = new Date(match.match_date);
    return matchDate > injuryDate && matchDate <= recoveryDate;
  });

  return missedMatches.length;
} 