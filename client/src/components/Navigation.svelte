<style>
    .o-wrapper-contests-navigation {
        border-top: 2px solid #d6d6da;
        margin: 0 0 0.75em 0;
        position: sticky;
        top: 0;
        background: #fff;
    }
    .m-contests, .m-menu-contest-groups, .m-menu-contest-groups ul {
        width: 100%;
    }
    .m-menu-contest-groups ul {
        justify-content: space-between;
    }
</style>

<script>
    // routing
    import {link} from 'svelte-spa-router';
</script>
<div class="o-wrapper o-wrapper-sub-navigation o-wrapper-topics-navigation o-wrapper-contests-navigation">
    <a class="a-subnav-label a-topics-label a-contests-label" href="/">Elections</a>
    <div class="m-sub-navigation m-topics m-contests">
        <nav class="m-subnav-navigation m-topics-navigation m-menu-contest-groups">
            <ul>
                <li><a href="/contests/?scope=state" use:link>State</a></li>
                <li><a href="/contests/?scope=us_house"  use:link>U.S. House</a></li>
                <li><a href="/contests/?scope=state_senate" use:link>State Senate</a></li>
                <li><a href="/contests/?scope=state_house" use:link>State House</a></li>
                <li><a href="/contests/?scope=school" use:link>School Districts</a></li>
                <li><a href="/contests/?scope=municipal" use:link>Municipal</a></li>
                <li><a href="/contests/?scope=county" use:link>County</a></li>
            </ul>
        </nav>
    </div>
</div>