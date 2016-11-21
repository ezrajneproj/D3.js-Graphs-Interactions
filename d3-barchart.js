/* Mouse events */
function overrideTooltipForIndustrialCollaborators(d) {
    return d.ID +
        ", £" +
        (d.Value / 1000000).toFixed(2) +
        "M, Collaborators: " +
        d.Collaborators.length +
        ", " +
        d.Title +
        ", " +
        d.organisation.Name;
}

function overrideMouseOverEvent() {
    global_barchartObject.overideMouseEnter(function (d) {
        if (isVisuallyImpared) {
            d3.select(".grantinfo").select("p").node().innerHTML = d3.select(this).select('title').text();
        }
    });
    global_barchartObject.overideMouseLeave(function (d) {
        if (isVisuallyImpared) {
            d3.select(".grantinfo").select("p").node().innerHTML = "";
        }
    });
}


function overideBarClick(d, i) { //clicking on bar loads tree organization and highlights topic
    toggleTreeNodeFromExternalEvent([d.organisation], "barchart");
    updateGraphLayout("barchart", d);
}

/* Initialization of BarchartObject, shows empty data first*/
function initializeBarchart(grantData) {
    //Set up renderers
    global_barchartObject = barchart("#bc1Div");
    global_bcGrantData = grantData;

    var hlp = grantAndTopicDataHelperFunctions();
    hlp.insertOrganisationsIntoGrantsTable(global_bcGrantData);  //insert organization so that there's a link in tree and barchart
    hlp.insertGrantListsIntoPersonsTable(global_bcGrantData);

    //barchart will only generate once an org is selected
    global_barchartObject.showEmptyBarchartText();
}

function isGrantEmpty(grants) {
    if (grants.length === 0) {
        global_barchartObject.showEmptyBarchartText();
        showEmptyPackText("svgTopicAndResearchArea");
        loadRelatedTopicOfGrants([]); //to empty pack layout, pass empty array
        return true;
    }
    return false;
}

function loadAndRenderNormalBarchart(grants) {
    if (isGrantEmpty(grants)) return;
    renderGrantBarcharObjecttByType("normal", grants);
}

function loadGrantIntoQuarterYear(grants) {
    if (isGrantEmpty(grants)) return;
    
    var minYear = Math.min.apply(null, //get the minimum year of grants startdate
        grants.map(function (grant) {
            var date = grant.StartDate.split("/");
            return date[2];
        }));

    var maxYear = Math.max.apply(null, //get the maximum year of grants enddate
        grants.map(function (grant) {
            var date = grant.EndDate.split("/");
            return date[2];
        }));

    /* Basing from the minimum startYear and maximum endYear, we create quarterYears 
       properties containing quarters from minimum year to maximum year */
    var quarterYears = [];
    for (var i = minYear; i <= maxYear; i++) {
        var quarters = [
            { "quarterYearLabel": "Q1 " + i, "year": i, "quarter": 1, "grants": [], "endquarteryear": "", "endyear": "" },
            { "quarterYearLabel": "Q2 " + i, "year": i, "quarter": 2, "grants": [], "endquarteryear": "", "endyear": "" },
            { "quarterYearLabel": "Q3 " + i, "year": i, "quarter": 3, "grants": [], "endquarteryear": "", "endyear": "" },
            { "quarterYearLabel": "Q4 " + i, "year": i, "quarter": 4, "grants": [], "endquarteryear": "", "endyear": "" }
        ];

        quarterYears = quarterYears.concat(quarters);
    }

    quarterYears.forEach(function (quarterYear) {
        grants.filter(function(grant) {
            var startdate = grant.StartDate.split("/");
            var enddate = grant.EndDate.split("/");
            var startyear = parseInt(startdate[2]);
            if (quarterYear.year === startyear) { //if same startyear, start loading quarter data to grant
                var quarterMonthMax = ((quarterYear.quarter * 3));
                var quarterMonthMin = quarterMonthMax - 2;
                //if within range, add to the quarter
                if (quarterYear.quarter <= quarterMonthMax && quarterYear.quarter >= quarterMonthMin) {
                    quarterYear.grants.push(grant);
                    grant.quarterYear = quarterYear; //assign quarterYear to grant for data
                }

                var endYrquarter = Math.ceil((enddate[1] / 3));
                grant.quarterYear.endyear = enddate[2];
                grant.quarterYear.endquarteryear = "Q" + endYrquarter + " " + enddate[2]; //assign the endyear and quarterYear to plot the grant in barchart from startdate to enddate
            }
        });
    });
    
    d3.select('#bc1Div').select('svg').selectAll("*").remove(); //remove all content first before loading
    renderGrantBarcharObjecttByType("gantt", { "grants": grants, "quarterYears": quarterYears });
}

function renderGrantBarcharObjecttByType(type, data) {
    d3.select('#empty-grant-text').remove();
    global_barchartObject.barClickCalback(overideBarClick);
    overrideMouseOverEvent();
    switch (type) {
        case "gantt":
            global_barchartObject.loadAndRenderGantt(data.grants, data.quarterYears);
            break;
        case "normal":
            global_barchartObject.loadAndRenderDataset(data);
            break;
    }
}

function loadAndRenderBarchartByUser(grants) {
    //load barchart grants
    switch (usertype) {
        case 2: //Industrial Collaborator, add collaborator info in tooltip
            global_barchartObject.overideTooltip(overrideTooltipForIndustrialCollaborators);
        case 1: //General Public
            loadGrantIntoQuarterYear(grants); //loads both for usertype 1 & 2
            break;
        case 3:
        default: //load topic if no selected user type
            loadAndRenderNormalBarchart(grants);
            break;
    }
}

var global_grantAndTopicDataHelper = grantAndTopicDataHelperFunctions();

function updateBarchart(source, data) {
    var relatedGrants = [];
    switch (source) {
        case "pack_topic":
            relatedGrants = global_grantAndTopicDataHelper.getGrantObjsForATopic(data.id, global_bcGrantData, data.topics); //data = id,topicData
            loadAndRenderNormalBarchart(relatedGrants);
            break;
        case "pack_researcharea":
            relatedGrants = global_bcGrantData.grants.filter(function (grant) {
                return grant.ResearchArea === data;
            });
            loadGrantIntoQuarterYear(relatedGrants);
            break;
        case "pack_person": //load grants and research area
            loadGrantIntoQuarterYear(data.grants);
            break;
        case "tree_org": //load grants and research area
            relatedGrants = global_bcGrantData.grants.filter(function (grant) {
                return grant.organisation.nodename === data.nodename || grant.organisation[data.level] === data.nodename; //search by Country, Region, City and nodename if matches
            });
            loadAndRenderBarchartByUser(relatedGrants);
            break;
        case "barchart": //update self from barclick
            loadAndRenderBarchartByUser([data]);
            break;
    }

    return relatedGrants;
}