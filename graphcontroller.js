function loadPacksByUserType(grants) { //load different data into pack base on user type
    d3.selectAll(".empty-pack-text").text("");
    switch (usertype) {
        case 2: //Industrial Collaborator
            loadInvestigatorsOfGrants(grants, global_bcGrantData.persons);
        case 1: //General Public
            loadResearchAreasOfGrants(grants); //loads for both 1 & 2
            break;
        case 3: //Visually impaireds
        default: //load topic if no selected user type
            loadRelatedTopicOfGrants(grants);
            break;
    }
}

function updateGraphLayout(source, data) {
    var relatedGrants;
    switch (source) {
        case "pack_topic":
            /* If topic-pack is clicked, update barchart and tree */
            relatedGrants = updateBarchart(source, data);
            toggleTreeNodeFromExternalEvent(relatedGrants.map(function (grant) { return grant.organisation; }), source);
            break;
        case "pack_researcharea":
            /* If researchArea-pack is clicked, update barchart and tree
               And if user is Industrial Collaborator, show Investigators pack */
            relatedGrants = updateBarchart(source, data);
            
            if (usertype === 2) { //load investigators of grants into another pack
                loadInvestigatorsOfGrants(relatedGrants, global_bcGrantData.persons);
            }
            loadResearchAreasOfGrants(relatedGrants);
            toggleTreeNodeFromExternalEvent(relatedGrants.map(function (grant) { return grant.organisation; }), source);
            break;
        case "pack_person":
            /* If an investigator is clicked from person-pack, load the related research areas, grants, and firms */
            updateBarchart(source, data);
            loadResearchAreasOfGrants(data.grants); //load pack by passing ResearchAreas
            toggleTreeNodeFromExternalEvent(data.grants.map(function (grant) { return grant.organisation; }), source);
            break;
        case "tree_org": 
            /* If an organization is selected, load the related research areas, grants, and topics depending on user type */
            relatedGrants = updateBarchart(source, data);
            loadPacksByUserType(relatedGrants);
            break;
        case "barchart": //update self from barclick
            //if (usertype === 1) updateBarchart(source, data);
            updateBarchart(source, data);
            loadPacksByUserType([data]);
            break;
    }
}