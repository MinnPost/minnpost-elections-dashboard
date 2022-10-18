<script>
	// svelte-pathfinder stuff
	import { click, prefs, path, query, fragment, submit, state, pattern } from 'svelte-pathfinder';
	// pathfinder preferences
	prefs.hashbang = true;

	// layout components
	import Header from "./components/Header.svelte";
	import Search from './components/Search.svelte';
	import Navigation from './components/Navigation.svelte';
	import Results from "./components/Results.svelte";
	import Contest from "./components/Contest.svelte";

</script>

<style>
	.election-results {
		font-family: "ff-meta-web-pro", helvetica, arial, sans-serif;
	}
	:global(.election-results h2, .election-results .h2, .election-results h3, .election-results .h3, .election-results h4, .election-results .h4, .election-results h5, .election-results .h5) {
		font-family: "ff-meta-web-pro", helvetica, arial, sans-serif;
	}
</style>

<svelte:window on:click={click} />

<div class="election-results">

	<Search pattern="{$pattern}"/>
	
	<Header/>

	<!--<Navigation/>-->

	<Results pattern="{$pattern}"/>


</div>