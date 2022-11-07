import { loc } from "svelte-spa-router";

// set up navigation context
export function navigationContext(resultStore = [], contest = {}, isPaginated = false, location = '', querystring = '') {
    let searchParams = new URLSearchParams(querystring);
    let path = {
        "label": ""
    };
    let matchScope = '';
    let matchSearch = '';
    let contestPaths = [
        {
            "location": "/",
            "scope": "",
            "label": "featured",
        },
        {
            "scope": "state",
            "label": "statewide",
        },
        {
            "scope": "us_house",
            "label": "U.S. House",
        },
        {
            "scope": "state_house",
            "label": "State House",
        },
        {
            "scope": "state_senate",
            "label": "State Senate",
        }
    ];
    if (searchParams.get('scope') !== null) {
        matchScope = searchParams.get('scope');
    }
    if (searchParams.get('q') !== null) {
        matchSearch = searchParams.get('q');
    }
    if (matchScope !== null) {
        if (matchScope === 'county') {
            let countyPath = {
                "scope": "county",
                "label": matchScope,
            }
            contestPaths.push(countyPath);
        }
        if (isPaginated === true && matchScope === 'school') {
            let schoolBoardPath = {
                "scope": "school",
                "search": "School Board Member",
                "text": "All school board " + label + 's',
                "label": "School Board",
            }
            contestPaths.push(schoolBoardPath);
        }
        if (isPaginated === true && matchScope === 'municipal') {
            let municipalPath = {
                "scope": "municipal",
                "search": "municipal",
                "text": "All municipal contests",
                "label": "municipal",
            }
            contestPaths.push(municipalPath);
        }
    }
    if (matchSearch !== null) {
        matchSearch = encodeURIComponent(matchSearch).toLowerCase();
        if (matchSearch.includes('county')) {
            let countyName = matchSearch.replace('%20county', '');
            let countyPath = {
                "scope": "county",
                "search": countyName + "%20county",
                "label": countyName.charAt(0).toUpperCase() + countyName.slice(1) + " County",
            }
            contestPaths.push(countyPath);
        }
        if (matchSearch === 'county') {
            let countyPath = {
                "search": 'county',
                "label": 'county',
            }
            contestPaths.push(countyPath);
        }
        if (matchSearch === 'question') {
            let questionPaths = [
                {
                    "scope": "county",
                    "search": "question",
                    "text": "All ballot questions",
                    "label": "ballot question",
                },
                {
                    "scope": "municipal",
                    "search": "question",
                    "text": "All ballot questions",
                    "label": "ballot question",
                },
                {
                    "scope": "school",
                    "search": "question",
                    "text": "All ballot questions",
                    "label": "ballot question",
                }
            ];
            contestPaths = contestPaths.concat(questionPaths);
        }
        if (matchSearch.includes('school%20board%20member')) {
            let schoolBoardPath = {
                "scope": "school",
                "search": 'school%20board%20member',
                "text": "All school board members",
                "label": "school board",
            }
            contestPaths.push(schoolBoardPath);
        }
    }

    if (Object.keys(contest).length !== 0) {
        if (contest.scope) {
            matchScope = contest.scope;
        }
        if (matchScope === 'county' && contest.place_name && contest.place_name !== '') {
            let countyPath = {
                "scope": "county",
                "search": contest.place_name + "%20County",
                "label": contest.place_name + " County",
            }
            contestPaths.push(countyPath);
        }
        if (isPaginated === true && (contest.sub_title !== null || contest.question_body)) {
            matchSearch = 'question';
            let questionPaths = [
                {
                    "scope": "county",
                    "search": "question",
                    "text": "All ballot questions",
                    "label": "Ballot Question"
                },
                {
                    "scope": "municipal",
                    "search": "question",
                    "text": "All ballot questions",
                    "label": "Ballot Question"
                },
                {
                    "scope": "school",
                    "search": "question",
                    "text": "All ballot questions",
                    "label": "Ballot Question"
                }
            ];
            contestPaths = contestPaths.concat(questionPaths);
        }
        if (isPaginated === true && matchScope === 'school' && contest.title.toLowerCase().includes('School Board Member'.toLowerCase())) {
            matchSearch = "School Board Member";
            let schoolBoardPath = {
                "scope": "school",
                "search": "School Board Member",
                "text": "All school board " + label + 's',
                "label": "school board",
            }
            contestPaths.push(schoolBoardPath);
        }
    }

    path = contestPaths.findLast((e) => e.location == location);
    if (matchScope !== "") {
        path = contestPaths.findLast((e) => e.scope == matchScope);
        if (resultStore.length === 1) {
            return path;
        }
    }
    if (matchSearch !== "") {
        path = contestPaths.findLast((e) => e.search == matchSearch.toLowerCase());
    }
    return path;
}