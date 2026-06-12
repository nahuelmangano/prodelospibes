type MatchLock = {
  matchDate: Date;
  isFinished: boolean;
};

export function hasMatchStarted(match: MatchLock, now = new Date()) {
  return match.matchDate.getTime() <= now.getTime();
}

export function canEditPrediction(match: MatchLock, now = new Date()) {
  return !match.isFinished && !hasMatchStarted(match, now);
}
