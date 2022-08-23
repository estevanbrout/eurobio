import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { TextureLoader } from 'three'
const TWEEN = require('@tweenjs/tween.js');

const container = document.getElementById( 'dna-integration' );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

renderer.setClearColor('#000', 1);

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 1000 );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xffffff );

// var ah = window.ah = new THREE.AxesHelper(1);
// scene.add( ah );

// const controls = new OrbitControls( camera, renderer.domElement );
// controls.screenSpacePanning = true;

camera.position.set( 0, 0, 0 );

const target = new THREE.Vector3();

// -----------------------------------------------------------------------

// https://2pha.com/demos/threejs/shaders/2_color_fresnel.html

var fresnelMat = new THREE.ShaderMaterial( {

  uniforms: {
    color1: { type: "c", value: new THREE.Color( 0xB4F1FF ) }, // edge, light blue
    color2: { type: "c", value: new THREE.Color( 0x130f49 ) }, // base, dark blue
    alpha: { type: "f", value: 0.75 },
    fresnelBias: { type: "f", value: 0.1 },
    fresnelScale: { type: "f", value: 1.0 },
    fresnelPower: { type: 'f', value: 1.5 }
  },

  vertexShader: /* glsl */ `
    uniform float fresnelBias;
    uniform float fresnelScale;
    uniform float fresnelPower;

    varying float vReflectionFactor;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      vec4 worldPosition = modelMatrix * vec4( position, 1.0 );

      vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );

      vec3 I = worldPosition.xyz - cameraPosition;

      vReflectionFactor = fresnelBias + fresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), fresnelPower );

      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float alpha;

    varying float vReflectionFactor;

    void main() {
      gl_FragColor = vec4(mix(color2, color1, vec3(clamp( vReflectionFactor, 0.0, 1.0 ))), alpha);
    }
  `,
  // wireframe: true,
  transparent: true,
} );

var fresnelMat2 = fresnelMat.clone();
fresnelMat2.uniforms.color1.value.setHex( 0xe9f9ff ); // light pink
fresnelMat2.uniforms.color2.value.setHex( 0x34a1cd ); // pink

// -----------------------------------------------------

// curve path for dna strand

class SinCurve1 extends THREE.Curve {

  constructor( scale ) {
    super( scale );
    this.scale = ( scale === undefined ) ? 1 : scale;
  }

  getPoint ( t, target ) {

    var ty = t * 5;
    var tx = Math.sin( 1 * Math.PI * t );
    var tz = Math.cos( 1 * Math.PI * t );

    var point = new THREE.Vector3( tx, ty, tz ).multiplyScalar( this.scale );

    if ( target ) target.copy( point );

    return point;

  }

}

class SinCurve2 extends THREE.Curve {

  constructor( scale ) {
    super( scale );
    this.scale = ( scale === undefined ) ? 1 : scale;
  }

  getPoint ( t, target ) {

    var ty = t * 10;
    var tx = Math.sin( 2 * Math.PI * t );
    var tz = Math.cos( 2 * Math.PI * t );

    var point = new THREE.Vector3( tx, ty, tz ).multiplyScalar( this.scale );

    if ( target ) target.copy( point );

    return point;

  }

}

class SinCurve3 extends THREE.Curve {

  constructor( scale ) {
    super( scale );
    this.scale = ( scale === undefined ) ? 1 : scale;
  }

  getPoint ( t, target ) {

    var ty = t * 15;
    var tx = -Math.sin( 2.8 * Math.PI * t );
    var tz = - Math.cos( 2.8 * Math.PI * t );
    // var tz = 0;

    var point = new THREE.Vector3( tx, ty, tz ).multiplyScalar( this.scale );

    if ( target ) target.copy( point );

    return point;

  }

}

var curve1 = new SinCurve1( 4.5 );
var curve2 = new SinCurve2( 5 );
var curve3 = new SinCurve3( 4 );

// visual for curve

var points = curve1.getPoints( 50 );
var geometryPoints = new THREE.BufferGeometry().setFromPoints( points );
var lineMat = new THREE.LineBasicMaterial({ color: 0xcccccc });
var line = new THREE.Line( geometryPoints, lineMat );

// ------------------------------------------

class DNA extends THREE.Group {

  constructor( curve, total ) {

    super();

    var cylLength = 2;
    var cylGeo = new THREE.CylinderBufferGeometry( .1, .1, cylLength / 2, 16, 1, true );
    var cylinder = new THREE.Mesh( cylGeo, fresnelMat );
    cylinder.position.y = cylLength / 4;

    var cylinder2 = new THREE.Mesh( cylGeo, fresnelMat2 );
    cylinder2.position.y =  - cylLength / 4;

    var sphereGeo = new THREE.SphereBufferGeometry( 0.3, 32, 32 );
    var sphere = new THREE.Mesh( sphereGeo, fresnelMat );
    sphere.position.y = cylLength / 2 + 0.25;
    
    var sphere2 = new THREE.Mesh( sphereGeo, fresnelMat2 );
    sphere2.position.y = - cylLength / 2 - 0.25;
    
    var barGroup = new THREE.Group();
    barGroup.add( cylinder );
    barGroup.add( cylinder2 );
    barGroup.add( sphere );
    barGroup.add( sphere2 );
  
    total = total || 80;
  
    for ( var i = 1; i <= total; i++ ) {
  
      var bGroup = new THREE.Group();
  
      var bar = barGroup.clone();
      bar.rotation.z = Math.PI * (i / 10);
      bar.userData.startZ = bar.rotation.z;
      bGroup.add( bar );
  
      curve.getPoint( i / total, bGroup.position );
  
      var nextPoint = curve.getPoint( (i+1) / total );
      bGroup.lookAt( nextPoint );
  
      this.add( bGroup );
  
    }

    // this.add( new THREE.AxesHelper(1) );
  }

  update( playhead ) {
    this.children.forEach(obj => {
      if ( obj.isGroup ) {
        var bar = obj.children[0];
        bar.rotation.z = bar.userData.startZ - Math.PI * playhead;
      }
    });
  }

}

// -------------------

var dna1 = window.dna1 = new DNA( curve1, 50 );
scene.add( dna1 );
dna1.position.set( 1, -10, 0 );

// visual for curve
// dna1.add( line );

var dna2 = new DNA( curve2, 100 );
//scene.add( dna2 );
// dna2.rotation.y = - Math.PI / 2;
dna2.position.set( 10, -30, -4 );

var dna3 = new DNA( curve3, 100 );
//scene.add( dna3 );
dna3.position.set( -10, -28, -4 );


// -----------------------------------------------------------------------
// -----------------------------------------------------------------------

// particles

var ParticleShader = {

  uniforms: {

    color:   { type: 'v3', value: new THREE.Color( 0x2a4a52 ) },
    texture: { type: 't', value: null },
    time:    { type: 'f', value: 0 },
    size:    { type: 'f', value: 50.0 }

  },

  vertexShader: /* glsl */ `
    uniform float time;
    uniform float size;
    attribute float alphaOffset;
    varying float vAlpha;
    uniform vec4 origin;

    void main() {

      vAlpha = 0.5 * ( 1.0 + sin( alphaOffset + time ) );
      // vAlpha = 1.0;

      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      float cameraDist = distance( mvPosition, origin );
      gl_PointSize = size / cameraDist;
      gl_Position = projectionMatrix * mvPosition;

    }
  `,

  fragmentShader: /* glsl */ `
    uniform float time;
    uniform vec3 color;

    varying float vAlpha;

    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
      gl_FragColor = vec4( color, alpha );
    }
  `
};


//

var timeline = {
  playhead: 0
}

var tween1 = new TWEEN.Tween( timeline )
.to( { playhead: 1 }, 1000 * 30 )
.easing( TWEEN.Easing.Linear.None )
.repeat( Infinity )
.start();

// ---------------------------------------------------------------
// ---------------------------------------------------------------

window.addEventListener( 'resize', resize, false );
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

renderer.setAnimationLoop( loop );

function loop() {

  TWEEN.update();

  var playhead = timeline.playhead;

  dna1.update( playhead * 8 );
  dna2.update( playhead * 6 );
  dna3.update( playhead * 7 );

  // controls.update();

  // update camera and target position

  //camera.position.x = - Math.sin( 2 * Math.PI * playhead ) * 25;
  camera.position.z = Math.cos( 2 * Math.PI * playhead ) * 50;
  camera.position.z = 25;
  camera.position.y = Math.sin( 2 * 2 * Math.PI * playhead ) * 1;

  target.x = - Math.sin( 2 * Math.PI * playhead ) * 2;
 target.z = Math.cos( 2 * Math.PI * playhead ) * 10;

  camera.lookAt( target );

  //

  renderer.render(scene, camera);

}