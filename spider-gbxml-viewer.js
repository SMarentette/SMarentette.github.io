const version = "2020-05-27";

const urlGbxmlDefault = "https://smarentette.github.io/gbXML/Model.xml";

const aGithubHref = "https://github.com/ladybug-tools/spider-gbxml-tools/tree/master/spider-gbxml-viewer";

const description = `
This was developed by Steve Marentette by forking Ladybug Tools Spider 3D Viewer. It uses the 
<a href="https://threejs.org" target="_blank">Three.js</a> JavaScript library to render 3D geometry from gbXML files.
`;

let timeStart;

function init() {

	divDescription.innerHTML = description;

	THR.init();
	THR.addLights();
	THR.addGround();
	THR.animate();

	const target = window.self === window.top ? window : window.parent;
	target.addEventListener("hashchange", onHashChange);

       onHashChange();
}

function onHashChange() {
	timeStart = performance.now();

	const url = parent.location.hash.slice(1) || urlGbxmlDefault;

	requestFile(url, onLoadXml);
}

function onLoadXml(response) {
	// Clear previous model
	if (GBX.meshGroup && GBX.meshGroup.parent) {
		GBX.meshGroup.parent.remove(GBX.meshGroup);
	}
	
	// Create new mesh group
	GBX.meshGroup = THR.setSceneNew();
	GBX.meshGroup.name = "GBX.meshGroup";

	// Parse and display new model
	GBX.parseResponse(response);
	THR.updateGroup(GBX.meshGroup); 

	divFileData.innerHTML = `
		<p>
			File name: ${url.split("/").pop()}<br>
			File size: ${response.length.toLocaleString()}<br>
			Time to load: ${((performance.now() - timeStart) / 1000).toLocaleString()} seconds<br>
		</p>`;
}

RAY.getHtm = function (intersected) {
	const index = intersected.object.userData.index;
	const surfaceText = GBX.surfaces[index];

	const parser = new DOMParser();
	const surfaceXml = parser.parseFromString(surfaceText, "text/xml");

	const surface = surfaceXml.getElementsByTagName("Surface")[0];

	const htm = `
		<div>
			type: ${surface.attributes["surfaceType"].value}<br>
			id: ${surface["id"]}<br>
			CADobjectId:<br> ${surface.childNodes[7].textContent}</br>
			<button onclick=GXD.getSurfaceData(${index}); >view surface data</button>
		</div>`;

	return htm;
};

function requestFile(url, callback, type = "json") {
	const xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.onerror = xhr => console.log("error:", xhr);
	xhr.onload = xhr => callback(xhr.target.response);
	xhr.send(null);
}

async function populateXmlListFromJson() {
	const listUrl = "https://smarentette.github.io/gbXML/filelist.json";
	try {
		const res = await fetch(listUrl);
		const files = await res.json();

		const select = document.getElementById("xmlFileList");
		select.innerHTML = `<option disabled selected>Select a model</option>`;

		files.forEach(file => {
			const option = document.createElement("option");
			option.value = `https://smarentette.github.io/gbXML/${file}`;
			option.text = file;
			select.appendChild(option);
		});
	} catch (err) {
		console.error("Could not fetch XML file list", err);
	}
}

function loadSelectedFile(url) {
	location.hash = url;
}

window.addEventListener("DOMContentLoaded", populateXmlListFromJson);
