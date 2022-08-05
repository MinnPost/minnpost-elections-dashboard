export let apiRoot = "http://0.0.0.0:5000/api/";

export async function fetchContests() {
	const res = await fetch(`${apiRoot}contests/?title=governor`);
	const json = await res.json();
	if (res.ok) {
        console.log(json);
		return json;
	} else {
		throw new Error(json);
	}
}
