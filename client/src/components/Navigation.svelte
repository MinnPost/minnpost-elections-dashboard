<script>
    // svelte-pathfinder stuff
	import { path } from 'svelte-pathfinder';
</script>

<nav>
    <ul>
        <li><a href="/contests/?scope=state" on:click={e => $path = "/contests/?scope=state"}>State</a></li>
        <li><a href="#!/contests/?scope=us_house" on:click={e => $path = "/contests/?scope=us_house"}>U.S. House</a></li>
        <li><a href="#!/contests/?scope=state_senate" on:click={e => $path = "/contests/?scope=state_senate"}>State Senate</a></li>
        <li><a href="#!/contests/?scope=state_house" on:click={e => $path = "/contests/?scope=state_house"}>State House</a></li>
        <li><a href="#!/contests/?scope=school" on:click={e => $path = "/contests/?scope=school"}>School Districts</a></li>
        <li><a href="#!/contests/?scope=municipal" on:click={e => $path = "/contests/?scope=municipal"}>Municipal</a></li>
        <li><a href="#!/contests/?scope=hospital" on:click={e => $path = "/contests/?scope=hospital"}>Hospital</a></li>
        <li><a href="#!/contests/?scope=district_court" on:click={e => $path = "/contests/?scope=district_court"}>District Court</a></li>
        <li><a href="#!/contests/?scope=county" on:click={e => $path = "/contests/?scope=county"}>County</a></li>
    </ul>
</nav>