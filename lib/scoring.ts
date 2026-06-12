type Score = {
  homeScore: number;
  awayScore: number;
};

function outcome(score: Score) {
  if (score.homeScore > score.awayScore) return "HOME";
  if (score.homeScore < score.awayScore) return "AWAY";
  return "DRAW";
}

export function calculatePoints(prediction: Score, result: Score) {
  if (prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore) {
    return 3;
  }

  return outcome(prediction) === outcome(result) ? 1 : 0;
}
