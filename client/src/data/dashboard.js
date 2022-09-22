// set the races
let dashboardRaces = [
    {
        title: 'State Senator District 3',
        type: 'race',
        id: 'id-MN---3-0123',
        rows: 5
    },
    {
        title: 'State Senator District 7',
        type: 'race',
        id: 'id-MN---7-0127',
        rows: 2
    },
    {
        title: 'Minneapolis Question 2',
        type: 'race',
        id: 'id-MN---43000-1132',
        rows: 2
    },
    {
        title: 'Minneapolis Question 3',
        type: 'race',
        id: 'id-MN---43000-1133',
        rows: 2
    },
    {
        title: 'St. Paul Question 1',
        type: 'race',
        id: 'id-MN---58000-1131',
        rows: 2
    },
    {
        title: 'Minneapolis Council Member — Ward 3',
        type: 'race',
        id: 'id-MN---43000-2121',
        rows: 3
    },
    {
        title: 'Minneapolis Council Member — Ward 9',
        type: 'race',
        id: 'id-MN---43000-2181',
        rows: 3
    },
    {
        title: 'Minneapolis Council Member — Ward 10',
        type: 'race',
        id: 'id-MN---43000-2191',
        rows: 3
    }
];

// only use the ids. this might be unnecessary if we restructure.
export let dashboard = dashboardRaces.map(function (el) { return el.id; });
