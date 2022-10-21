//export let apiRoot = "http://0.0.0.0:5000/api/";
export let apiRoot = "https://minnpost-mn-election-results.herokuapp.com/api/";
export let electionId = "id-20221108";

// api calls
export async function fetchContests(key, value, withResults = false) {
	let res = [];
	let endpoint = 'contests';
	if (withResults === true) {
		endpoint = 'contests-with-results';
	}
	if ( key && value ) {
		res = await fetch(`${apiRoot}${endpoint}/?${key}=${value}&election_id=${electionId}`);
	} else {
		res = await fetch(`${apiRoot}${endpoint}/?election_id=${electionId}`);
	}
	const json = await res.json();
	if (res.ok) {
		return json.data;
	} else {
		throw new Error(json);
	}
}

export async function fetchElection() {
	const res = await fetch(`${apiRoot}elections/?election_id=${electionId}`);
	const json = await res.json();
	if (res.ok) {
		return json.data[0];
	} else {
		throw new Error(json);
	}
}
