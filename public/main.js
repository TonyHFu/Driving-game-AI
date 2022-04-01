import * as THREE from "./vendor/three.module.js";
// import { OrbitControls } from "./vendor/OrbitControls.js";
import * as CANNON from "./vendor/cannon-es.js";
import CannonDebugger from "./vendor/cannon-es-debugger.js";

// Initializing THREE JS
const scene = new THREE.Scene();

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

const width = 10;
const height = width * (window.innerHeight / window.innerWidth);
const camera = new THREE.OrthographicCamera(
	width / -2,
	width / 2,
	height / 2,
	height / -2,
	1,
	100
);

camera.position.set(4, 4, 4);
camera.lookAt(0, 0, 0);

// Initializing CANNON
const world = new CANNON.World();
world.gravity.set(0, -10, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 40;

//Make box

// const geometry = new THREE.BoxGeometry(3, 1, 3);
// const material = new THREE.MeshLambertMaterial({ color: 0xfb8e00 });
// const mesh = new THREE.Mesh(geometry, material);
// mesh.position.set(0, 5, 0);
// scene.add(mesh);

// const shape = new CANNON.Box(
//   new CANNON.Vec3(1.5, 0.5, 1.5)
// );
// const mass = 5;
// const boxBodyMaterial = new CANNON.Material()
// const body = new CANNON.Body({ mass, shape, material: boxBodyMaterial });
// body.position.set(0, 5, 0);
// world.addBody(body);

//Make car
const chassisShape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 1));
const chassisBody = new CANNON.Body({ mass: 150 });
chassisBody.addShape(chassisShape);
chassisBody.position.set(0, 0, 0);
// chassisBody.angularVelocity.set(0, 0.5, 0);

world.addBody(chassisBody);

const vehicle = new CANNON.RaycastVehicle({
	chassisBody,
	indexRightAxis: 0,
	indexUpAxis: 1,
	indeForwardAxis: 2,
});

const wheelOptions = {
	radius: 0.5,
	directionLocal: new CANNON.Vec3(0, -1, 0),
	suspensionStiffness: 30,
	suspensionRestLength: 0.3,
	frictionSlip: 5,
	dampingRelaxation: 2.3,
	dampingCompression: 4.4,
	maxSuspensionForce: 100000,
	rollInfluence: 0.01,
	axleLocal: new CANNON.Vec3(-1, 0, 0),
	chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1),
	maxSuspensionTravel: 0.3,
	customSlidingRotationalSpeed: -30,
	useCurstomSlidingRotationalSpeed: true,
};
wheelOptions.chassisConnectionPointLocal.set(-1, 0, 1);
vehicle.addWheel(wheelOptions);

wheelOptions.chassisConnectionPointLocal.set(-1, 0, -1);
vehicle.addWheel(wheelOptions);

wheelOptions.chassisConnectionPointLocal.set(1, 0, 1);
vehicle.addWheel(wheelOptions);

wheelOptions.chassisConnectionPointLocal.set(1, 0, -1);
vehicle.addWheel(wheelOptions);

vehicle.addToWorld(world);

const wheelBodies = [];
const wheelMaterial = new CANNON.Material("wheel");
vehicle.wheelInfos.forEach(wheel => {
	const cylinderShape = new CANNON.Cylinder(
		wheel.radius,
		wheel.radius,
		wheel.radius / 2,
		20
	);
	const wheelBody = new CANNON.Body({
		mass: 1,
		material: wheelMaterial,
	});
	// wheelBody.type = CANNON.Body.KINEMATIC;
	// wheelBody.collisionFilterGroup = 0 // turn off collisions
	// wheelBody.addShape(cylinderShape);
	// wheelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
	const quaternion = new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0);
	wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);

	// const q = new CANNON.Quaternion();
	// 		q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
	// 		wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
	wheelBodies.push(wheelBody);
	world.addBody(wheelBody);
});

world.addEventListener("postStep", () => {
	for (let i = 0; i < vehicle.wheelInfos.length; i++) {
		vehicle.updateWheelTransform(i);
		const transform = vehicle.wheelInfos[i].worldTransform;
		const wheelBody = wheelBodies[i];
		wheelBody.position.copy(transform.position);
		wheelBody.quaternion.copy(transform.quaternion);
	}
});

// Make floor

// const floorGeometry = new THREE.PlaneGeometry(10, 10);
// const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
// const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
// floorMesh.quaternion.setFromAxisAngle( new CANNON.Vec3(1,0,0), -Math.PI/2);
// floorMesh.position.set(0, -3, 0);
// scene.add(floorMesh);

const floorShape = new CANNON.Plane();
const floorBodyMaterial = new CANNON.Material();
const floorBody = new CANNON.Body({
	mass: 0,
	shape: floorShape,
	material: floorBodyMaterial,
});
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
floorBody.position.set(0, -3, 0);
world.addBody(floorBody);

// const contactMaterial = new CANNON.ContactMaterial(boxBodyMaterial, floorBodyMaterial, {
//   friction: 0.3,
//   restitution: 0,
//   contactEquationStiffness: 1000
// })

// world.addContactMaterial(contactMaterial);

//Wheel Ground Contact

const wheel_ground = new CANNON.ContactMaterial(
	wheelMaterial,
	floorBodyMaterial,
	{
		friction: 1,
		restitution: 0,
		contactEquationStiffness: 1000,
	}
);
world.addContactMaterial(wheel_ground);

//

const debugRenderer = new CannonDebugger(scene, world);

// const renderer = new THREE.WebGL1Renderer({ antialias: true });
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.render(scene, camera);

function animate() {
	requestAnimationFrame(animate);
	updatePhysics();
	debugRenderer.update();
	renderer.render(scene, camera);
}

function updatePhysics() {
	world.step(1 / 60);
	// mesh.position.copy(body.position);
}

// renderer.setAnimationLoop(animation);
animate();

document.body.appendChild(renderer.domElement);
