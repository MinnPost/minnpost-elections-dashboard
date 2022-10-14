// Mark who won.  Overall having all precincts reporting is good
// enough but with ranked choice, we need have all the final data
// in.  Primaries need to choose winners per parties
function contestIsDone(contest) {
    let done = false;
    if (contest.precincts_reporting === contest.total_effected_precincts) {
        done = true;
    }
    return done;
}

// If there is a percent needed option.  We assume yes no questions
export function isWinner(contest, result, key) {
    let isWinner = false;
    if (contest.percent_needed && contest.percent_needed > 0 && contestIsDone(contest) === true) {
        if (result.candidate.toLowerCase() === 'yes' && result.percentage >= contest.percent_needed) {
            isWinner = true;
        }
        else if (result.candidate.toLowerCase() === 'no' && result.percentage > (100 - contest.percent_needed)) {
            isWinner = true;
        }
        return isWinner;
    } else if ((contest.done && !contest.ranked_choice && !contest.primary) ||
    (contestIsDone(contest) && contest.ranked_choice && rankedChoiceFinal && !contest.primary) ||
    (contestIsDone(contest) && contest.primary && !contest.partisan)) {
        // Conditions where we just want the top seats
        if (key < contest.seats && !result.percent) {
            isWinner = true;
        }
        r.final = true;
    } else if (contest.done && contest.primary && contest.partisan) {
        isWinner = false;
        if (key < contest.seats) {
            isWinner = true;
        }
        r.final = true;
    }
    return isWinner;
}

/*// Get ranked choice final results
if (parsed.ranked_choice) {
rankedChoiceFinal = (_.size(parsed.results) == _.size(_.filter(parsed.results, function(r) {
    return (!_.isUndefined(r.ranked_choices[100]));
})));
}
*/