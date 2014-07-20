JSM.ThreeViewer = function ()
{
	this.canvas = null;
	
	this.scene = null;
	this.camera = null;
	this.renderer = null;
	this.ambientLight = null;
	this.directionalLight = null;
	this.runBeforeRender = null;
	this.runAfterRender = null;

	this.cameraMove = null;
	this.navigation = null;
	this.settings = null;
};

JSM.ThreeViewer.prototype.Start = function (canvasName, settings)
{
	if (!this.IsWebGLEnabled ()) {
		return false;
	}

	if (!this.InitSettings (settings)) {
		return false;
	}
	
	if (!this.InitThree (canvasName)) {
		return false;
	}

	if (!this.InitCamera (settings)) {
		return false;
	}

	if (!this.InitLights ()) {
		return false;
	}
	
	this.DrawIfNeeded ();
	if (this.settings.autoUpdate) {
		this.AutoUpdate ();
	}
	return true;
};

JSM.ThreeViewer.prototype.IsWebGLEnabled = function ()
{
	if (!window.WebGLRenderingContext) {
		return false;
	}

	if (!document.createElement ('canvas').getContext ('experimental-webgl')) {
		return false;
	}

	return true;
};

JSM.ThreeViewer.prototype.InitSettings = function (settings)
{
	this.settings = {
		cameraEyePosition : new JSM.Coord (1.0, 1.0, 1.0),
		cameraCenterPosition : new JSM.Coord (0.0, 0.0, 0.0),
		cameraUpVector : new JSM.Coord (0.0, 0.0, 1.0),
		lightAmbientColor : [0.5, 0.5, 0.5],
		lightDiffuseColor : [0.5, 0.5, 0.5],
		autoUpdate : true
	};

	if (settings !== undefined) {
		if (settings.cameraEyePosition !== undefined) { this.settings.cameraEyePosition = JSM.CoordFromArray (settings.cameraEyePosition); }
		if (settings.cameraCenterPosition !== undefined) { this.settings.cameraCenterPosition = JSM.CoordFromArray (settings.cameraCenterPosition); }
		if (settings.cameraUpVector !== undefined) { this.settings.cameraUpVector = JSM.CoordFromArray (settings.cameraUpVector); }
		if (settings.lightAmbientColor !== undefined) { this.settings.lightAmbientColor = settings.lightAmbientColor; }
		if (settings.lightDiffuseColor !== undefined) { this.settings.lightDiffuseColor = settings.lightDiffuseColor; }
		if (settings.autoUpdate !== undefined) { this.settings.autoUpdate = settings.autoUpdate; }
	}

	return true;
};

JSM.ThreeViewer.prototype.InitThree = function (canvasName)
{
	this.canvas = document.getElementById (canvasName);
	if (!this.canvas || !this.canvas.getContext) {
		return false;
	}

	this.scene = new THREE.Scene();
	if (!this.scene) {
		return false;
	}

	var parameters = {
		canvas : this.canvas,
		antialias : true
	};
	this.renderer = new THREE.WebGLRenderer (parameters);
	if (!this.renderer) {
		return false;
	}
	
	this.renderer.setSize (this.canvas.width, this.canvas.height);
	return true;
};

JSM.ThreeViewer.prototype.InitCamera = function (settings)
{
	this.cameraMove = new JSM.Camera (
		JSM.CoordFromArray (settings.cameraEyePosition),
		JSM.CoordFromArray (settings.cameraCenterPosition),
		JSM.CoordFromArray (settings.cameraUpVector),
		settings.fieldOfView,
		settings.nearClippingPlane,
		settings.farClippingPlane
	);
	if (!this.cameraMove) {
		return false;
	}

	this.navigation = new JSM.Navigation ();
	if (!this.navigation.Init (this.canvas, this.cameraMove, this.DrawIfNeeded.bind (this))) {
		return false;
	}
	
	this.camera = new THREE.PerspectiveCamera (this.cameraMove.fieldOfView, this.canvas.width / this.canvas.height, this.cameraMove.nearClippingPlane, this.cameraMove.farClippingPlane);
	if (!this.camera) {
		return false;
	}
	
	this.scene.add (this.camera);
	return true;
};

JSM.ThreeViewer.prototype.InitLights = function ()
{
	var ambientColor = new THREE.Color ();
	var diffuseColor = new THREE.Color ();
	ambientColor.setRGB (this.settings.lightAmbientColor[0], this.settings.lightAmbientColor[1], this.settings.lightAmbientColor[2]);
	diffuseColor.setRGB (this.settings.lightDiffuseColor[0], this.settings.lightDiffuseColor[1], this.settings.lightDiffuseColor[2]);

	this.ambientLight = new THREE.AmbientLight (ambientColor.getHex ());
	if (!this.ambientLight) {
		return false;
	}

	this.scene.add (this.ambientLight);
	
	this.directionalLight = new THREE.DirectionalLight (diffuseColor.getHex ());
	if (!this.directionalLight) {
		return false;
	}
	
	this.directionalLight.position = new THREE.Vector3 ().subVectors (this.cameraMove.eye, this.cameraMove.center);
	this.scene.add (this.directionalLight);
	return true;
};

JSM.ThreeViewer.prototype.SetRunBeforeRender = function (runBeforeRender)
{
	this.runBeforeRender = runBeforeRender;
};

JSM.ThreeViewer.prototype.SetRunAfterRender = function (runAfterRender)
{
	this.runAfterRender = runAfterRender;
};

JSM.ThreeViewer.prototype.AddMesh = function (mesh)
{
	this.scene.add (mesh);
	this.DrawIfNeeded ();
};

JSM.ThreeViewer.prototype.AddMeshes = function (meshes)
{
	var i;
	for (i = 0; i < meshes.length; i++) {
		this.scene.add (meshes[i]);
	}
	this.DrawIfNeeded ();
};

JSM.ThreeViewer.prototype.MeshCount = function ()
{
	var count = 0;
	
	this.scene.traverse (function (current) {
		if (current instanceof THREE.Mesh) {
			count = count + 1;
		}
	});
	
	return count;
};

JSM.ThreeViewer.prototype.VertexCount = function ()
{
	var count = 0;
	
	this.scene.traverse (function (current) {
		if (current instanceof THREE.Mesh) {
			count = count + current.geometry.vertices.length;
		}
	});
	
	return count;
};

JSM.ThreeViewer.prototype.FaceCount = function ()
{
	var count = 0;
	
	this.scene.traverse (function (current) {
		if (current instanceof THREE.Mesh) {
			count = count + current.geometry.faces.length;
		}
	});
	
	return count;
};

JSM.ThreeViewer.prototype.GetMesh = function (index)
{
	var current = null;
	var currIndex = 0;
	
	var i;
	for (i = 0; i < this.scene.children.length; i++) {
		current = this.scene.children[i];
		if (current instanceof THREE.Mesh) {
			if (currIndex == index) {
				return current;
			}
			currIndex = currIndex + 1;
		}
	}
	
	return null;
};

JSM.ThreeViewer.prototype.RemoveMesh = function (mesh)
{
	this.scene.remove (mesh);
	this.DrawIfNeeded ();
};

JSM.ThreeViewer.prototype.RemoveMeshes = function ()
{
	var current;
	var i;
	for (i = 0; i < this.scene.children.length; i++) {
		current = this.scene.children[i];
		if (current instanceof THREE.Mesh) {
			this.scene.remove (current);
			i--;
		}
	}
	
	this.DrawIfNeeded ();
};

JSM.ThreeViewer.prototype.RemoveLastMesh = function ()
{
	var found = null;
	
	this.scene.traverse (function (current) {
		if (current instanceof THREE.Mesh) {
			found = current;
		}
	});
	
	if (found !== null) {
		this.scene.remove (found);
	}
	
	this.DrawIfNeeded ();
};

JSM.ThreeViewer.prototype.SetCamera = function (eye, center, up)
{
	this.cameraMove.Set (eye, center, up);
	this.DrawIfNeeded ();
};

JSM.ThreeViewer.prototype.Resize = function ()
{
	this.camera.aspect = this.canvas.width / this.canvas.height;
	this.camera.updateProjectionMatrix ();
	this.renderer.setSize (this.canvas.width, this.canvas.height);
	this.DrawIfNeeded ();
};

JSM.ThreeViewer.prototype.FitInWindow = function ()
{
	var center = this.GetCenter ();
	var radius = this.GetBoundingSphereRadius ();
	this.FitInWindowWithCenterAndRadius (center, radius);
};

JSM.ThreeViewer.prototype.FitInWindowWithCenterAndRadius = function (center, radius)
{
	var offsetToOrigo = JSM.CoordSub (this.cameraMove.center, center);
	this.cameraMove.origo = center;
	this.cameraMove.center = center;
	this.cameraMove.eye = JSM.CoordSub (this.cameraMove.eye, offsetToOrigo);
	
	var centerEyeDirection = JSM.VectorNormalize (JSM.CoordSub (this.cameraMove.eye, this.cameraMove.center));
	var fieldOfView = this.cameraMove.fieldOfView / 2.0;
	if (this.canvas.width < this.canvas.height) {
		fieldOfView = fieldOfView * this.canvas.width / this.canvas.height;
	}
	var distance = radius / Math.sin (fieldOfView * JSM.DegRad);
	
	this.cameraMove.eye = JSM.CoordOffset (this.cameraMove.center, centerEyeDirection, distance);
	this.DrawIfNeeded ();
};

JSM.ThreeViewer.prototype.GetCenter = function ()
{
	var boundingBox = this.GetBoundingBox ();
	var center = JSM.MidCoord (boundingBox[0], boundingBox[1]);
	return center;
};

JSM.ThreeViewer.prototype.GetBoundingBox = function ()
{
	var min = new JSM.Coord (JSM.Inf, JSM.Inf, JSM.Inf);
	var max = new JSM.Coord (-JSM.Inf, -JSM.Inf, -JSM.Inf);
	
	var geometry, coord;
	this.scene.traverse (function (current) {
		if (current instanceof THREE.Mesh) {
			geometry = current.geometry;
			var j;
			for (j = 0; j < geometry.vertices.length; j++) {
				coord = geometry.vertices[j].clone ();
				coord.add (current.position);
				min.x = JSM.Minimum (min.x, coord.x);
				min.y = JSM.Minimum (min.y, coord.y);
				min.z = JSM.Minimum (min.z, coord.z);
				max.x = JSM.Maximum (max.x, coord.x);
				max.y = JSM.Maximum (max.y, coord.y);
				max.z = JSM.Maximum (max.z, coord.z);
			}
		}
	});

	return [min, max];
};

JSM.ThreeViewer.prototype.GetBoundingSphereRadius = function ()
{
	var center = this.GetCenter ();
	var radius = 0.0;

	var geometry, coord, distance;
	this.scene.traverse (function (current) {
		if (current instanceof THREE.Mesh) {
			geometry = current.geometry;
			var j;
			for (j = 0; j < geometry.vertices.length; j++) {
				coord = geometry.vertices[j].clone ();
				coord.add (current.position);
				distance = JSM.CoordDistance (center, new JSM.Coord (coord.x, coord.y, coord.z));
				if (JSM.IsGreater (distance, radius)) {
					radius = distance;
				}
			}
		}
	});

	return radius;
};

JSM.ThreeViewer.prototype.GetObjectsUnderPosition = function (x, y)
{
	var mouseX = (x / this.canvas.width) * 2 - 1;
	var mouseY = -(y / this.canvas.height) * 2 + 1;

	var projector = new THREE.Projector ();
	var cameraPosition = this.camera.position;
	var vector = new THREE.Vector3 (mouseX, mouseY, 0.5);
	projector.unprojectVector (vector, this.camera);
	vector.sub (cameraPosition);
	vector.normalize ();

	var ray = new THREE.Raycaster (cameraPosition, vector);
	return ray.intersectObjects (this.scene.children);
};

JSM.ThreeViewer.prototype.GetObjectsUnderMouse = function ()
{
	return this.GetObjectsUnderPosition (this.navigation.mouse.currX, this.navigation.mouse.currY);
};

JSM.ThreeViewer.prototype.GetObjectsUnderTouch = function ()
{
	return this.GetObjectsUnderPosition (this.navigation.touch.currX, this.navigation.touch.currY);
};

JSM.ThreeViewer.prototype.ProjectVector = function (x, y, z)
{
	var width = this.canvas.width;
	var height = this.canvas.height;
	var halfWidth = width / 2;
	var halfHeight = height / 2;

	var projector = new THREE.Projector ();
	var vector = new THREE.Vector3 (x, y, z);
	projector.projectVector (vector, this.camera);
	vector.x = (vector.x * halfWidth) + halfWidth;
	vector.y = -(vector.y * halfHeight) + halfHeight;
	return vector;
};

JSM.ThreeViewer.prototype.Draw = function ()
{
	if (this.runBeforeRender !== null) {
		this.runBeforeRender ();
	}
	
	this.camera.position = new THREE.Vector3 (this.cameraMove.eye.x, this.cameraMove.eye.y, this.cameraMove.eye.z);
	this.camera.up = new THREE.Vector3 (this.cameraMove.up.x, this.cameraMove.up.y, this.cameraMove.up.z);
	this.camera.lookAt (new THREE.Vector3 (this.cameraMove.center.x, this.cameraMove.center.y, this.cameraMove.center.z));
	this.directionalLight.position = new THREE.Vector3 ().subVectors (this.cameraMove.eye, this.cameraMove.center);
	this.renderer.render (this.scene, this.camera);
	
	if (this.runAfterRender !== null) {
		this.runAfterRender ();
	}
};

JSM.ThreeViewer.prototype.DrawIfNeeded = function ()
{
	if (!this.settings.autoUpdate) {
		this.Draw ();
	}
};

JSM.ThreeViewer.prototype.AutoUpdate = function ()
{
	this.Draw ();
	requestAnimationFrame (this.AutoUpdate.bind (this));
};