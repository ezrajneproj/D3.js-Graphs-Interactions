/*
* Tree rendering base from
* https://bl.ocks.org/jjzieve/a743242f46321491a950
*
* Transformed the flatlist organization array first
* into a hierarchy with name and children property
*/
function transformDataIntoHierarchyWithChildren(organization) {
    var treeOrgData = { "nodename": "Organization", "children": [] };
    //need to create a hierarchy with "children" properties to create the tree
    organization.forEach(function (org) {
        var orgCountry = org.Country;
        var orgRegion = org.Region;
        var orgCity = org.City;

        var country = treeOrgData.children.find(function (countryLevelItem) { return countryLevelItem.nodename === orgCountry; });
        if (!country) //if country does not exist yet, create the country object
        {
            country = { "nodename": orgCountry, "children": [], "level": "Country" };
            treeOrgData.children.push(country); //add the country to the parent
        }

        var region = country.children.find(function (regionLevelItem) { return regionLevelItem.nodename === orgRegion; });
        if (!region) //if region does not exist yet, create the region object
        {
            region = { "nodename": orgRegion, "children": [], "level": "Region" }
            country.children.push(region); //add the region to the parent country
        }

        var city = region.children.find(function (cityLevelItem) { return cityLevelItem.nodename === orgCity; });
        if (!city) //if city does not exist yet, create the city object
        {
            city = { "nodename": orgCity, "children": [], "level": "City" }
            region.children.push(city); //add the city to the parent region
        }

        org.nodename = org.Name;
        org.level = "Organization";
        city.children.push(org); //set the organization as child of the city
    });
    console.log(treeOrgData);
    return treeOrgData;
}

function initializeAndRenderTree(organization) {


    var treeOrgData = transformDataIntoHierarchyWithChildren(organization);
    
    // ************** Generate the tree diagram	 *****************
    //basically a way to get the path to an object
    function searchTree(obj, search, path) {
        if (obj.nodename === search) { //if search is found return, add the object to the path and return it
            path.push(obj);
            return path;w
        }
        else if (obj.children || obj._children) { //if children are collapsed d3 object will have them instantiated as _children
            var children = (obj.children) ? obj.children : obj._children;
            for (var i = 0; i < children.length; i++) {
                path.push(obj);// we assume this path is the right one
                var found = searchTree(children[i], search, path);
                if (found) {// we were right, this should return the bubbled-up path from the first if statement
                    return found;
                }
                else {//we were wrong, remove this parent from the path and continue iterating
                    path.pop();
                }
            }
        }
        else {//not the right object, return false so it will continue to iterate in the loop
            return false;
        }
    }
    
    d3.select("body")
		.append("div") // declare the tooltip div
		.attr("class", "tooltip")
		.style("opacity", 0);

    var margin = { top: 20, right: 120, bottom: 20, left: 60 },
		width = 525 - margin.right - margin.left,
		height = 650 - margin.top - margin.bottom;

    var i = 0,
        duration = 750;

    var tree = d3.layout.tree()
		.size([height, width]);

    var diagonal = d3.svg.diagonal()
		.projection(function (d) { return [d.y, d.x]; });

    var svg = d3.select("#graphics-content").append("svg")
		.attr("width", width + margin.right + margin.left)
		.attr("height", height + margin.top + margin.bottom)
	  	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    //recursively collapse children
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }
    
    //d3.json("flare.json", function (error, values) {
    var root = treeOrgData;
        root.x0 = height / 2;
        root.y0 = 0;
        root.children.forEach(collapse);
        update(root, "tree");

    d3.select(self.frameElement).style("height", "800px");

    function onClickTreeNode(d) {
        cleanNodeOfActiveStatus();
        global_selectedTreeNode = d;
        toggleTreeNode(d);
    }

    // Toggle children on click.
    function toggleTreeNode(d) {
        if (d.nodename === "Organization") {
            return;
        }

        if (d.children) {
            d._children = d.children;
            d.children = null;
        }
        else {
            d.children = d._children;
            d._children = null;
        }

        update(d, "tree");

        //after updating tree, call the graphcontroller to update the other layouts
        updateGraphLayout("tree_org", { "nodename": d.nodename, "level": d.level });
    }

    cleanNodeOfActiveStatus = function () {
        svg.selectAll("g.treenode")
            .select('circle')
            .each(function(d, i) {
                d.activatedByTree = false;
                d.class = "notfound";
            });

        //svg.selectAll("g.treenode")
        //    .select('circle')
        //.style("fill", function (d) {
        //    if (d._children) {
        //        return "lightsteelblue";
        //    } else if (d.activatedByTree) {
        //        return "#ff7f0e";
        //    }
        //    else {
        //        return "#fff";
        //    }

        //})
		//.style("stroke", function (d) {
		//	if (d.class === "found") {
		//	    return "#ff7f0e"; //red
		//	}

		//	if (d.activatedByTree) {
		//	    return "#ff7f0e";
		//	}
		//});
    }

    collapseAllNodesToCountry = function () {
        svg.selectAll("g.treenode")
            .select('circle')
            .each(function (d, i) {
                if (d.children && d.level === "Country") {
                    d._children = d.children;
                    d.children = null;
                }
            });
    }

    collapseNotSelectedNodes = function () {
        svg.selectAll("g.treenode")
            .select('circle')
            .each(function (d, i) {
                if (d.children && d.level === "Country" && d.class !== "found") {
                    d._children = d.children;
                    d.children = null;
                }

                if (d.children && d.level === "Region" && d.class !== "found") {
                    d._children = d.children;
                    d.children = null;
                }

                if (d.children && d.level === "City" && d.class !== "found") {
                    d._children = d.children;
                    d.children = null;
                }
            });
    }

    toggleTreeNodeFromExternalEvent = function (orgs, eventSource) {

        //clean active status of tree (clear red mark)
        //collapse some tree nodes with no active children
        cleanNodeOfActiveStatus();
        switch(eventSource) {
            case "pack_person":
            case "pack_researcharea":
            case "barchart":
                collapseNotSelectedNodes();
                break;
            case "pack_topic":
                collapseAllNodesToCountry();
                break;
        }

        orgs.forEach(function(org) {
            var orgToActivate = organization.find(function (o) {
                return o.OrgID === org.OrgID;
            });

            var countryNode = d3.selectAll(".treenode.orgName" + orgToActivate.Country.replace(/\s+/g, '')); //remove whitelines
            if (countryNode.data()[0]) { //if country is visible, check region
                var countryData = countryNode.data()[0];
                if (!countryData.children) {
                    countryData.children = countryData._children;
                }

                //assign value to children so that the tree will expand
                var region = countryData.children.find(function (r) {
                    return r.nodename === org.Region;
                });

                if (!region.children) {
                    region.children = region._children;
                }

                var city = region.children.find(function (c) {
                    return c.nodename === org.City;
                });

                if (!city.children) {
                    city.children = city._children;
                }

                if (eventSource !== "tree") { //if event is triggered outside tree graph, set the activatedByTree to true
                    orgToActivate.activatedByTree = true; //this will highlight the circle even though it was not clicked by mouse
                    global_selectedTreeNode.class = "notfound"; //the currently selectedTreeNode's class should be notfound, this will deselect and unhighlight it
                    update(global_selectedTreeNode, eventSource); //call update directly to update the rendered tree layout
                } else {
                    global_selectedTreeNode = orgToActivate;
                    toggleTreeNode(global_selectedTreeNode);
                }
            }
        });
        
    }
    
    function update(source, eventSource) {
        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
		links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            if (d.children || d._children) { //depth is length of path line
                d.y = d.depth * 95;
            } else {
                d.y = d.depth * 113;
            }
        });

        // Update the nodes…
        var node = svg.selectAll("g.treenode")
			.data(nodes, function (d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter()
            .append("g")
            .attr("class",
                function(d) {
                    return "treenode orgID" +
                        (d.OrgID || " ") +
                        " orgName" +
                        d.nodename
                        .replace(/\s+/g, '');
                })
            .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
            .on("click", onClickTreeNode)
            .on("mouseenter", function (d) {
                if (isVisuallyImpared) {
                    d3.select(this).classed("biglink", true);
                }
            })
            .on("mouseleave", function (d) {
                if (isVisuallyImpared) {
                    d3.select(this).classed("biglink", false);
                }
            });

        nodeEnter.append("circle")
		.attr("r", 1e-6)
		.style("fill", function (d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeEnter.append("title").text(function (d) {
            return d.nodename;
        });

        nodeEnter.append("text")
			.attr("x", function (d) { return -10; })
			.attr("dy", ".35em")
			.attr("text-anchor", function (d) { return "end"; })
			.text(function (d) { return d.nodename; })
			.style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
			.duration(duration)
			.attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; });

        nodeUpdate.select("circle")
			.attr("r", 4.5)
			.style("fill", function (d) {
                if (d.id === source.id && eventSource === "tree") { //eventSource should be from tree to change the class to found
                    d.class = "found";
                } else {
                    d.class = "notfound";
                }

                if (d.class === "found" || d.activatedByTree) { //activatedByTree is when event is triggered outside from tree
			        return "#ff7f0e";
			    }
			    else if (d._children) {
                    return "lightsteelblue";
                } else {
                    return "#fff";
                }
            })
			.style("stroke", function (d) {
			    if (d.class === "found" || d.activatedByTree) {
			        return "#ff7f0e"; //red
			    }
			});


        nodeUpdate.select("circle") //color all parents
            .style("fill",
                function (d) {
                    if (d.id === source.id && eventSource === "tree") {
                        d.class = "found";
                        var parent = d.parent;
                        while (parent) { //parents class should also be changed to found
                            parent.class = "found";
                            parent = parent.parent;
                        }
                    }

                    if (d.class === "found") {
                        return "#ff7f0e"; //red 
                    }
                });

        nodeUpdate.select("text")
			.style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
			.duration(duration)
			.attr("transform", function (d) { return "translate(" + source.y + "," + source.x + ")"; })
			.remove();

        nodeExit.select("circle")
			.attr("r", 1e-6);

        nodeExit.select("text")
			.style("fill-opacity", 1e-6);

        // Update the links…
        var link = svg.selectAll("path.link")
			.data(links, function (d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
			.attr("class", "link")
			.attr("d", function (d) {
			    var o = { x: source.x0, y: source.y0 };
			    return diagonal({ source: o, target: o });
			});

        // Transition links to their new position.
        link.transition()
			.duration(duration)
			.attr("d", diagonal)
			.style("stroke", function (d) {
			    if (d.target.class === "found") {
			        return "#ff7f0e";
			    }
			});

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
			.duration(duration)
			.attr("d", function (d) {
			    var o = { x: source.x, y: source.y };
			    return diagonal({ source: o, target: o });
			})
			.remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }
}