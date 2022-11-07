<style>
    form {
        border-bottom: 1px solid #5e6e76;
        padding: 0 1.5em;
        margin: 0 auto 1.5em auto;
        width: 83.6842105263%;
    }
    fieldset {
        border: 0;
    }
    @media screen and (min-width: 30em) {
        form {
            width: 75.5172413793%;
        }
    }
    @media screen and (min-width: 50em) {
        form {
            width: 58.7179487179%;
        }
    }
    @media screen and (min-width: 60em) {
        form {
            width: 59.1525423729%;
        }
    }
    @media screen and (min-width: 70em) {
        form {
            width: 75.5172413793%;
        }
    }
    :global(div.m-autocomplete-items) {
        z-index: 100000;
    }
    :global(div.autocomplete) {
        width: 100%;
    }
    :global(.input-container) {
        width: 100%;
        height: 100%;
        display: flex;
        margin: 0;
    }
    :global(span.autocomplete-clear-button) {
        opacity: 0.6;
    }
    :global(.m-form-search-contest-by-address) {
        display: none;
    }
</style>

<script>
    // settings
	import {settings} from './../settings.js';

    // routing
    import {push, location, querystring} from 'svelte-spa-router';

    import AutoComplete from "simple-svelte-autocomplete"
    import { fetchContests } from "./../data/api.js";

    // form behavior
    let searchTerm = "";
    let searchParams = new URLSearchParams($querystring);
    if ( ! $location.startsWith("/search/") || searchParams.get('q') === null) {
        searchTerm = "";
    }
    let searchSubmit = function(event, value) {
        if ( typeof value === 'object' ) {
            value = value.title;
        }
        if (value === '') {
            const formData = new FormData(event.target);
            let data = [];
            for (let field of formData) {
                const [key, value] = field;
                data[key] = value;
            }
            if (data['q'] ) {
                value = data['q'];
            }
        }
        if ( value !== '') {
            push('/search/?q=' + value);
        }
        searchTerm = value;
    }
    let suggestedSearchClick = function(value) {
        if ( typeof value === 'object' ) {
            value = value.title;
        }
        if ( value !== '') {
            push('/search/?q=' + value);
        } else {
            push('/');
            clearInput();
        }
        searchTerm = value;
    }

    async function getContests(keyword) {
        let contests = await fetchContests('title', keyword, false, 0, false);
        return contests.data;
    }

    function getItem(value) {
        if (!value) {
            searchTerm = value;
            return '';
        }
        return value.title;
    }

    let selection = '';
    let autocompleteClearButton;
    let showAddressSearchForm;

    import { onMount } from 'svelte';
    onMount(() => {
        const autocompleteInput = document.querySelector('input.autocomplete-input');
        autocompleteInput.addEventListener('input', _inputChanged);

        const autocompleteList = document.querySelector('div.autocomplete-list');
        autocompleteList.addEventListener('click', _setAutocomplete);

        autocompleteClearButton = document.querySelector('span.autocomplete-clear-button');
        autocompleteClearButton.addEventListener('click', _clearedAutocomplete);
        _toggleClearButton(false);

        showAddressSearchForm = document.querySelector('.a-show-address-form');
        showAddressSearchForm.addEventListener('click', _showAddressForm);
    });

    function _inputChanged() {
        // doesn't catch changes made from JS (e.g. clearing)
        // @ts-ignore
        const newValue = this.value;
        _toggleClearButton(!!newValue);
        if (newValue.toLowerCase() != selection?.toLowerCase()) {
        selection = undefined;
        }
    }

    function _clearedAutocomplete() {
        selection = undefined;
        _toggleClearButton(false);
        push('/');
    }

    function _setAutocomplete(event) {
        _toggleClearButton(true);
        if (event.target.textContent) {
            let value = event.target.textContent;
            suggestedSearchClick(value);
        }
    }

    function _toggleClearButton(show) {
        autocompleteClearButton.setAttribute(
        'style',
        'display:' + (show ? 'block' : 'none')
        );
    }
    function clearInput() {
        autocompleteClearButton.click();
    }

    function _showAddressForm(e) {
        e.preventDefault();
        document.querySelector('.m-form-search-contest-by-address').setAttribute(
        'style',
        'display:block'
        );
        document.querySelector('.m-form-search-contest').setAttribute(
        'style',
        'display:none'
        );
    }

    let Geolocate;
	onMount(async () => {
        if (settings.searchByLocation === true) {
		    Geolocate = (await import('./Geolocate.svelte')).default;
        }
	});

</script>

<div class="m-form m-form-search m-form-search-contest">
    <form on:submit|preventDefault={() => searchSubmit(event, searchTerm)}>
        <fieldset>
            <label class="a-search-label screen-reader-text" for="q">Search for a contest</label>
            <div class="a-input-with-button a-button-sentence">
                <AutoComplete
                    type="search" name="q"
                    searchFunction="{getContests}"
                    delay="300"
                    localFiltering={false}
                    labelFieldName="title"
                    valueFunction={getItem}
                    bind:selectedItem="{searchTerm}"
                    bind:value={searchTerm}
                    inputClassName="search-field"
                    dropdownClassName="m-autocomplete-items"
                    placeholder="Search for a contest"
                    hideArrow="{true}"
                    cleanUserText={false}
                    minCharactersToSearch=3
                    showClear="{true}"
                    showLoadingIndicator="{true}"
                />
                <button type="submit" class="search-submit">Search</button>
            </div>
            {#if settings.searchByLocation === true}
                <p><small>To find results by location, <a href="#" class="a-show-address-form">search by an address</a> or <svelte:component this="{Geolocate}"/></small></p>
            {/if}
        </fieldset>
    </form>
</div>
