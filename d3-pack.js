function initializePackObject(packData, svgId, showEmpty) {

    //Create and customise pack renderer
    var packObject = setUpPackRenderer("#divPack1", svgId);

    d3.select('#divPack1').select('#' + svgId)
        .append('text').attr('id', 'empty-pack-text-' + svgId).attr('class', 'empty-pack-text');

    packObject.packData = packData;

    function setUpPackRenderer(div, svgId) {
        //function returns a customised pack renderer
        return packRenderer(div, svgId)
            .overideLeafLabel(function(d) {
                if (d.r > 25) { //if big circle return 3 words
                    return d.words[1] + " " + d.words[0] + " " + d.words[2];
                }
                else { //else return 1 word
                    return d.words[0];
                }

            })
            .overideParentLabel(function(d) { return "" });
    }

    if (showEmpty)
        showEmptyPackText(svgId); //show no data first

    return packObject;
}

function processFlatArrayIntoPack(packObject, svgId, category, overidePackClick, flatData, createItemFunction, existingCheck) {

    var hierarchyData = {
        "name": category,
        "children": []
    }

    //Clean all elements inside svg
    d3.select('#divPack1').select('#' + svgId).select('g').selectAll("*").remove();
    
    //transform data with count
    flatData.forEach(function (data) {
        var groupResearchArea = hierarchyData.children.filter(function (groupItem) {
            return existingCheck(groupItem, data);
        });

        if (groupResearchArea.length > 0) {
            groupResearchArea[0].size += 1;
            return;
        }

        //if not existing yet, add to array
        var item = createItemFunction(data);
        hierarchyData.children.push(item);
    });
    
    packObject.overideClickBehaviour(overidePackClick);
    return hierarchyData;
}

function renderResearchAreaOfGrants(researchAreas) {
    function overidePackClick(d, i) {
        //load barchart & highlight tree
        updateGraphLayout('pack_researcharea', d.name);
    }
    function existingCheck(groupItem, name) {
        return groupItem.name === name;
    }
    function createNewResearchAreaItem(name) {
        return { "name": name, "size": 1 };
    }
    var hierarchyData = processFlatArrayIntoPack(global_topicResearchPackObject,
        'svgTopicAndResearchArea', "Research Areas", overidePackClick, researchAreas, createNewResearchAreaItem, existingCheck);
    global_topicResearchPackObject.loadAndRenderResearchArea(hierarchyData);
}


function renderPersonsOfGrants(persons) {
    if(d3.select('#svgPersonsPack').node() === null){
        global_personPackObject = initializePackObject(persons, "svgPersonsPack");
    }
    function overidePackClick(d, i) {
        //load barchart & highlight tree
        updateGraphLayout("pack_person", d.personObject);
    }
    function existingCheck(groupItem, person) {
        return groupItem.name === person.Surname;
    }
    function createNewPersonItem(person) {
        return { "name": person.Surname, "size": 1, "personObject": person };
    }
    var hierarchyData = processFlatArrayIntoPack(global_personPackObject, 'svgPersonsPack', "Investigators", overidePackClick,
        persons, createNewPersonItem, existingCheck);

    global_personPackObject.overideTooltip(function (d, i) { //tooltip should be different for person
        if (d.personObject)
            return d.personObject.Title + " " + d.personObject.Surname + ", Department: " + d.personObject.Department;
        return d.name;
    });
    global_personPackObject.loadAndRenderPersons(hierarchyData);
}

//method from sample
function renderRelatedTopicOfGrants(relatedTopicsData) {
    var nLeaves;
    var hierarchy = {};
    var topicModelData = {};
    
    //Clean all elements inside svg
    d3.select('#divPack1').select('svg').select('g').selectAll("*").remove();

    //============== READ TOPIC AND GRANT DATA ============================
    topicModelData = relatedTopicsData;
    processTopicData();

    //=================================== FUNCTIONS ==============================
    function processTopicData() {
        //============= Create and render linkage table from topic similarities
        var clusterInstance = agglomerativeClustering();
        var linkageTable = clusterInstance.makeLinkageTable(topicModelData.topicsSimilarities);

        //=============== Create hierarchy =====================
        // Find topics in each cluster listed in expansion.groups[] 
        // and load into JSON hierarchy
        var groups = []; //groups will be length=0 if only 1 topic
        if (topicModelData.topicsSimilarities.length === 1) {
            linkageTable = clusterInstance.makeSingleLinkageTable(topicModelData.topicsSimilarities);
        }
        else {
            groups = clusterIntoGroups(topicModelData.topicsSimilarities.length, linkageTable);
        }
            
        hierarchy = findAllTopicsOfEachGroupAndCreateHierarchy(groups, linkageTable, nLeaves, topicModelData);
       
        function overidePackClick(d, i) {
            //load barchart
            updateGraphLayout("pack_topic", { "id": d.id, "topics": topicModelData });
        }
       
        global_topicResearchPackObject.overideClickBehaviour(overidePackClick);
        global_topicResearchPackObject.loadAndRenderDataset(hierarchy); //render
    }

    function clusterIntoGroups(minNumberGroups, linkageTable) {
        var topNode = linkageTable.length - 1;
        nLeaves = linkageTable.length + 1;

        function expandNodes(nodesToExpand, groups, nLeaves, linkageTable) {
            var nodesRequiringExpansion = [];
            nodesToExpand.forEach(function(currentNode) {

                if (currentNode >= 0) {
                    var index = groups.indexOf(currentNode);
                    groups.splice(index, 1);

                    //Add it's two clild groups: g1 and g2 to groups
                    var g1 = linkageTable[currentNode].cluster1 - nLeaves;
                    var g2 = linkageTable[currentNode].cluster2 - nLeaves;
                    groups.push(g1);
                    groups.push(g2);

                    //Add the two clild groups: g1 and g2 to groups 
                    // providing that they are not leaves 
                    if (g1 >= 0) nodesRequiringExpansion.push(g1);
                    if (g2 >= 0) nodesRequiringExpansion.push(g2);
                }

            });
            return { "groups": groups, "nodesRequiringExpansion": nodesRequiringExpansion }
        }

        //Set 'expansion' to be unexpanded top node to start. 
        var expansion = { "groups": [], "nodesRequiringExpansion": [topNode] }	//Flatten the top of the agglomerative clustering by recursively 
        //expanding the nodes until at least 'minNumberGroups'  have been found	
        while (expansion.groups.length < minNumberGroups) {
            expansion = expandNodes(expansion.nodesRequiringExpansion, expansion.groups, nLeaves, linkageTable);
        };
        return expansion.groups;
    }
}

function showEmptyPackText(svgId) {
    //Display no data text
    d3.select('#divPack1')
        .select("#" + svgId).select('g').selectAll("*").remove();

    d3.select('#divPack1')
        .select('#empty-pack-text-' + svgId)
        .attr("x", function (d) {
            return d3.select('#divPack1').select("#" + svgId).attr('width') * 0.5;
        })
		.attr("dy", 150)
        .attr("text-anchor", "middle")
        .text("No Data");
}

function loadRelatedTopicOfGrants(grants) {
    if (grants.length === 0) {
        showEmptyPackText("svgTopicAndResearchArea");
        return;
    }

    var grantIds = grants.map(function (grant) {
        return grant.ID;
    });

    var grantTopicHelper = grantAndTopicDataHelperFunctions();
    var relatedTopics = grantTopicHelper.getTopicsByGrantId(grantIds, global_topicResearchPackObject.packData);

    if (relatedTopics.topics.length === 0) {
        showEmptyPackText("svgTopicAndResearchArea");
        return;
    }

    renderRelatedTopicOfGrants(relatedTopics);
}

function loadResearchAreasOfGrants(grants) {
    if (usertype !== 2 && d3.select('#svgPersonsPack').node() !== null) {
        d3.select('#svgPersonsPack').remove();
    }

    if (grants.length === 0) {
        showEmptyPackText("svgTopicAndResearchArea");
        return;
    }

    var researchAreas = grants.map(function(grant) {
        return grant.ResearchArea;
    });

    renderResearchAreaOfGrants(researchAreas);
}

function loadInvestigatorsOfGrants(grants, persons) {
    var personIds = grants.map(function (grant) {
        return grant.Investigators;
    });
    var totalPersonIds = [].concat.apply([], personIds);

    if (grants.length === 0 || totalPersonIds.length === 0) {
        showEmptyPackText("svgTopicAndResearchArea");
        showEmptyPackText("svgPersonsPack");
        return;
    }

    var relatedPersons = [];
    totalPersonIds.forEach(function (personArrayItem) { //personIds are array of ids
            persons.forEach(function(person){
                if(person.ID === personArrayItem.ID){
                    relatedPersons.push(person);
                }
            });
        });
    renderPersonsOfGrants(relatedPersons);
}

