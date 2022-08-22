export let apiRoot = "http://0.0.0.0:5000/api/";
export let electionId = "id-20220809";

// api calls
export async function fetchContests(key, value) {
	let res = [];
	if ( key && value ) {
		res = await fetch(`${apiRoot}contests/?${key}=${value}&election_id=${electionId}`);
	} else {
		res = await fetch(`${apiRoot}contests/?election_id=${electionId}`);
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
