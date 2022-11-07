// Mark who won. Overall having all precincts reporting is good
// enough but with ranked choice, we need have all the final data
// in. Primaries need to choose winners per parties
function contestIsDone(contest) {
    let done = false;
    if (contest.precincts_reporting === contest.total_effected_precincts) {
        done = true;
    }
    return done;
}

// If there is a percent needed option. We assume yes no questions
export function isWinner(contest, result, key) {
    let isWinner = false;
    if (contest.percent_needed && contest.percent_needed > 0 && contestIsDone(contest) === true) {
        if (result.candidate.toLowerCase() === 'yes' && result.percentage >= contest.percent_needed) {
            isWinner = true;
        }
        else if (result.candidate.toLowerCase() === 'no' && result.percentage > (100 - contest.percent_needed)) {
            isWinner = true;
        }
    } else if ((contestIsDone(contest) && !contest.ranked_choice && !contest.primary) ||
    (contestIsDone(contest) && contest.ranked_choice && rankedChoiceFinal && !contest.primary) ||
    (contestIsDone(contest) && contest.primary && !contest.partisan)) {
        // Conditions where we just want the top seats
        if (key < contest.seats && !result.percent) {
            isWinner = true;
        }
        //r.final = true;
    } else if (contestIsDone(contest) && contest.primary && contest.partisan) {
        isWinner = false;
        if (key < contest.seats) {
            isWinner = true;
        }
        //r.final = true;
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

// AP date formatting
import Dateline from 'dateline';
export function apDate(string, hasTime = false, showTime = false, relative = true) {
    let apDate = '';
    if (string) {
        //let dateObject = new Date(string + ' 00:00:00-0600');
        if (hasTime === false) {
            string = string + ' 00:00:00';
        }
        let dateObject = new Date(string);
        dateObject.toLocaleString('en-US', { timeZone: 'America/Chicago' });
        if (showTime === false) {
            apDate = Dateline(dateObject).getAPDate({includeYear: true});
        } else {
            if ( relative === false ) {
                apDate = Dateline(dateObject).getAPDate({includeYear: true}) + ' ' + Dateline(dateObject).getAPTime();
            } else {
                const now = new Date();
                const nowWithoutTime = new Date(now.getTime());
                const dateObjectWithoutTime = new Date(dateObject.getTime());

                nowWithoutTime.setHours(0, 0, 0, 0);
                dateObjectWithoutTime.setHours(0, 0, 0, 0);
                nowWithoutTime.toLocaleString('en-US', { timeZone: 'America/Chicago' });
                dateObjectWithoutTime.toLocaleString('en-US', { timeZone: 'America/Chicago' });
                if (nowWithoutTime.getTime() === dateObjectWithoutTime.getTime()) {
                    apDate = 'at ' + Dateline(dateObject).getAPTime();
                } else {
                    apDate = 'on ' + Dateline(dateObject).getAPDate({includeYear: true}) + ' at ' + Dateline(dateObject).getAPTime();
                }
            }
            
        }
    }
    return apDate;
}

// language settings
export const pluralize = (count, noun, context = '', suffix = 's') => `${count} ${context}${noun}${count !== 1 ? suffix : ''}`;

// is this a test election?
export function isTestElection(date) {
    let isTest = false;
    if (date) {
        const now = new Date();
        date = date + ' 15:00:00';
        let dateObject = new Date(date);
        dateObject.toLocaleString('en-US', { timeZone: 'America/Chicago' });
        if (now < dateObject) {
          isTest = true;
        }
    }
    return isTest;
}

// are we showing the detail view for this contest? assumes we have a contest ID
// and that we don't have pagination.
export function isContestDetailView(location, querystring, contestCount) {
    let contestDetailView = false;
    let searchParams = new URLSearchParams(querystring);
    if ( location.startsWith("/contest/") && searchParams.get('id') !== null) {
        contestDetailView = true;
    }
    if (contestCount === 1) {
        contestDetailView = true;
    }
    if (searchParams.get('page') !== null) {
        contestDetailView = false;
    }
    return contestDetailView;
}

// are we showing the vote count?
export function showingVoteCount(location) {
    let showVoteCount = true;
    /*if (location === "/") {
        showVoteCount = true;
    } else {
        showVoteCount = true;
    }*/
    return showVoteCount;
}

// does this contest have a valid boundary to create a map?
export function contestHasMap(contest) {
    let contestHasMap = true;
    if ( contest.boundary === "" || ! contest.boundary ) {
        contestHasMap = false;
    }
    return contestHasMap;
}
