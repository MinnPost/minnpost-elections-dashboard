<script>
	import { click, prefs, path, query, fragment, submit, state, pattern } from 'svelte-pathfinder';
	// pathfinder preferences
	prefs.hashbang = true;

	// layout components
	import Header from "./Header.svelte";
	import Search from './Search.svelte';
	import Results from "./Results.svelte";

</script>

<svelte:window on:click={click} />

<div class="election-results">

	<Header/>

	<Search />

	{#if $pattern('/contests/:id')} <!-- eg. /products/1 -->
		contest id {$path.params.id}
	{:else}
		<Results/>
	{/if}

	<ol>
		<li>show results
			<ul>
				<li>list of current result races</li>
			</ul>
			<ul>
				<li>table of individual race's results</li>
				<li>map</li>
				<li>permalink to that race?</li>
			</ul>
		</li>
	</ol>

</div>