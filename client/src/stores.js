import { readable, writable, derived } from 'svelte/store';
import { dashboard } from './data/dashboard.js';
import { fetchElection, fetchContests } from "./data/api.js";
import { path, query, pattern } from 'svelte-pathfinder';

let delay = 300;
let fetchInterval = 50000;

const getTime = () => new Date().toLocaleTimeString();
const getValue = () =>  Math.floor(Math.random() * 10);

const datastream = readable(null, set => {
    const interval = setInterval(() => set({time: getTime()}), fetchInterval);
    return function stop() {
        clearInterval(interval);
  };
}); 

// routing
export const resultStore = derived([datastream, pattern, query], ([$datastream, $pattern, $query], set) => {
    //if ($datastream) {
    if ($pattern('/search/') && $query.params.q) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('title', $query.params.q, true).then(set);
                resolve()
            }, delay)
        })
    } else if ($pattern('/contests/')) {
        if ($query.params.scope) {
            new Promise((resolve) => {
                setTimeout(() => {
                    fetchContests('scope', $query.params.scope, true).then(set);
                    resolve()
                }, delay)
            })
        } else if ($query.params.group) {
            new Promise((resolve) => {
                setTimeout(() => {
                    fetchContests('results_group', $query.params.group, true).then(set);
                    resolve()
                }, delay)
            })
        }
    } else if ($pattern('/') && !$query.params.q) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('contest_ids', dashboard, true).then(set);
                resolve({name: "testing"})
            }, delay)
        })
    }
    //}
}, []);

// data
export const electionData = createElectionData();
function createElectionData() {
	const {subscribe, set, update} = writable([]);
	return {
		subscribe,
		fetchAll: () => {
			const fetchedElection = fetchElection();
			set(fetchedElection);
		}
	}
}
