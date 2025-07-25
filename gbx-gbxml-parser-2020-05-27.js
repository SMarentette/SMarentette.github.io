const GBX = {};

GBX.colorsDefault = {
	InteriorWall: 0x008000,
	ExteriorWall: 0xffb400,
	Roof: 0x800000,
	InteriorFloor: 0x80ffff,
	ExposedFloor: 0x40b4ff,
	Shade: 0xffce9d,
	UndergroundWall: 0xa55200,
	UndergroundSlab: 0x804000,
	Ceiling: 0xff8080,
	Air: 0xffff00,
	UndergroundCeiling: 0x408080,
	RaisedFloor: 0x4b417d,
	SlabOnGrade: 0x804000,
	FreestandingColumn: 0x808080,
	EmbeddedColumn: 0x80806e,
	Undefined: 0x88888888,
};

GBX.colors = Object.assign({}, GBX.colorsDefault); // create working copy of default colors
GBX.surfaceTypes = Object.keys(GBX.colors);

GBX.parseResponse = function (response) {
	GBX.string = response.replace(/[\t\n\r]/gm, "");
	//console.log( 'GBX.string', GBX.string );

	GBX.getElements();

	const meshes = GBX.getSurfaceMeshes(GBX.surfaces);
	//console.log( 'meshes', meshes );

	GBX.meshGroup.add(...meshes);
};

GBX.getElements = function () {
	const reSurface = /<Surface(.*?)<\/surface>/gi;
	GBX.surfaces = GBX.string.match(reSurface);
	//console.log( 'GBX.surfaces', GBX.surfaces );

	const reStoreys = /<BuildingStorey(.*?)<\/BuildingStorey>/gi;
	GBX.storeys = GBX.string.match(reStoreys);
	GBX.storeys = Array.isArray(GBX.storeys) ? GBX.storeys : [];
	//console.log( 'GBX.storeys', GBX.storeys );

	const reZones = /<Zone(.*?)<\/Zone>/gi;
	GBX.zones = GBX.string.match(reZones);
	GBX.zones = Array.isArray(GBX.zones) ? GBX.zones : [];
	//console.log( 'GBX.zones', GBX.zones );
};

GBX.getSurfaceMeshes = function (surfaces) {
	//console.log( 'GBX.surfaces', surfaces );

	const meshes = surfaces.map((surface, index) => {
		const polyLoops = GBX.getPolyLoops(surface);
		//console.log( 'polyLoops', polyLoops );

		let coordinates = GBX.getCoordinates(polyLoops[0]);
		//console.log( "coordinates", coordinates );

		const verticesSurfaces = [];

		for (let i = 0; i < coordinates.length; ) {
			verticesSurfaces.push(new THREE.Vector3(coordinates[i++], coordinates[i++], coordinates[i++]));
		}
		//console.log( 'verticesSurfaces', verticesSurfaces );

		const coordinatesArray = polyLoops.slice(1).map(polyLoop => GBX.getCoordinates(polyLoop));
		//console.log( 'coordinates2', coordinates2 );

		const openings = [];

		for (coordinates2 of coordinatesArray) {
			const opening = [];

			for (let i = 0; i < coordinates2.length; ) {
				opening.push(
					new THREE.Vector3(coordinates2[i++], coordinates2[i++], coordinates2[i++])
				);
			}

			openings.push(opening);
		}
		//console.log( 'openings', openings );

		verticesOpenings = GBX.parseOpenings(openings);
		//console.log( 'verticesOpenings', verticesOpenings );

		const surfaceType = surface.match('surfaceType="(.*?)"')[1];
		const color = new THREE.Color(GBX.colors[surfaceType]);
		//console.log( 'color', color );

		const mesh = GBX.getShape3d(verticesSurfaces, verticesOpenings, color);
		mesh.userData.index = index;
		//console.log( 'mesh', mesh );

		return mesh;
	});

	return meshes;
};

GBX.getPolyLoops = function (surface) {
	//console.log( 'surface', surface );

	const re = /<PlanarGeometry(.*?)<polyloop(.*?)<\/polyloop>/gi;
	const polyloopText = surface.match(re);

	//if ( !polyloopText ) { console.log( 'polyloopText', polyloopText, surface ) }

	const polyloops = polyloopText.map(polyloop => polyloop.replace(/<\/?polyloop>/gi, ""));

	return polyloops;
};

GBX.getCoordinates = function (text) {
	const re = /<Coordinate>(.*?)<\/Coordinate>/gi;
	const coordinatesText = text.match(re);
	//console.log( 'coordinatesText', coordinatesText );
	const coordinates = coordinatesText
		.map(coordinate => coordinate.replace(/<\/?coordinate>/gi, ""))
		.map(txt => Number(txt));

	return coordinates;
};

GBX.parseOpenings = function (verticesArray) {
	const holes = [];

	for (vertices of verticesArray) {
		const tempVerticesHoles = GBX.getTempVertices(vertices);
		//console.log( 'tempVerticesHoles', tempVerticesHoles );

		const path = new THREE.Path(tempVerticesHoles);
		//console.log( 'path', path, vertices );

		holes.push({ path, vertices });
	}

	return holes;
};

GBX.getShape3d = function (vertices = [], holes = [], color = 0xff0000) {
	if (vertices.length < 3) {
		console.log("vs", vertices);
	}

	const tempVertices = GBX.getTempVertices(vertices);

	const area = THREE.ShapeUtils.area(tempVertices);

	if (area === 0) {
		console.log("area", area, tempVertices);

		//return  ( new THREE.Mesh() );
	}

	const shape = new THREE.Shape(tempVertices);

	if (holes.length) {
		holes.forEach(hole => {
			shape.holes.push(hole.path);

			vertices = vertices.concat(hole.vertices.reverse());
			//console.log( 'vertices', vertices );
		});
	}

	const shapeGeometry = new THREE.ShapeGeometry(shape);

	shapeGeometry.vertices = vertices;  // THE trick!!

	//bufferGeometry = new THREE.BufferGeometry().fromGeometry( shapeGeometry )

	//const material = new THREE.MeshNormalMaterial( { opacity: 0.7, side: THREE.DoubleSide, transparent: true, wireframe: false } );
	const material = new THREE.MeshPhongMaterial({
		color: color,
		opacity: 0.9,
		side: THREE.DoubleSide,
		transparent: true,
		wireframe: false,
	});

	const mesh = new THREE.Mesh(shapeGeometry, material);
	// const box = new THREE.Box3().setFromObject(mesh);
	// const size = new THREE.Vector3();

	// box.getSize(size);

	// mesh.geometry.faceVertexUvs[0].forEach( fvUvs => {
	// 	fvUvs.forEach(fvUv => {
	// 		fvUv.x = (fvUv.x - box.min.x) / size.x; fvUv.y = 1 - (fvUv.y - box.min.y) / size.y;
	// 	});
	// } );

	
	mesh.geometry.computeVertexNormals();
	mesh.geometry.computeFaceNormals();
	mesh.geometry.computeBoundingBox();
	mesh.geometry.computeBoundingSphere();
	
	mesh.castShadow = true;
	mesh.receiveShadow = true;

	//console.log( "mgeo", mesh.geometry);
	mesh.updateMatrixWorld();

	return mesh;
};

GBX.getTempVertices = function (vertices) {
	// try using geometry??
	let triangle = new THREE.Triangle(vertices[2], vertices[1], vertices[0]);
	// const area = triangle.getArea();
	// if (area === 0) {
	// 	//console.log( "", area, vertices );
	// 	//triangle = new THREE.Triangle( vertices[ 3 ], vertices[ 1 ], vertices[ 0 ] );
	// }
	const normal = triangle.getNormal(new THREE.Vector3());
	const baseNormal = new THREE.Vector3(0, 0, 1);
	const quaternion = new THREE.Quaternion().setFromUnitVectors(normal, baseNormal);

	const tempVertices = vertices.map(vertex => vertex.clone().applyQuaternion(quaternion));
	//console.log( 'tempVertices', tempVertices );

	return tempVertices;
};
