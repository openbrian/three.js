/**
 * @author mrdoob / http://mrdoob.com/
 */

( function ( THREE ) {

	THREE.Raycaster = function ( origin, direction, near, far ) {

		this.ray = new THREE.Ray( origin, direction );
		this.near = near || 0;
		this.far = far || Infinity;

	};

	var sphere = new THREE.Sphere();
	var localRay = new THREE.Ray();
	var facePlane = new THREE.Plane();
	var intersectPoint = new THREE.Vector3();

	var inverseMatrix = new THREE.Matrix4();

	var descSort = function ( a, b ) {

		return a.distance - b.distance;

	};

	var v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

	// http://www.blackpawn.com/texts/pointinpoly/default.html

	var pointInFace3 = function ( p, a, b, c ) {

		v0.sub( c, a );
		v1.sub( b, a );
		v2.sub( p, a );

		var dot00 = v0.dot( v0 );
		var dot01 = v0.dot( v1 );
		var dot02 = v0.dot( v2 );
		var dot11 = v1.dot( v1 );
		var dot12 = v1.dot( v2 );

		var invDenom = 1 / ( dot00 * dot11 - dot01 * dot01 );
		var u = ( dot11 * dot02 - dot01 * dot12 ) * invDenom;
		var v = ( dot00 * dot12 - dot01 * dot02 ) * invDenom;

		return ( u >= 0 ) && ( v >= 0 ) && ( u + v < 1 );

	};

	var intersectObject = function ( object, raycaster, intersects ) {

		if ( object instanceof THREE.Particle ) {

			var distance = raycaster.ray.distanceToPoint( object.matrixWorld.getPosition() );

			if ( distance > object.scale.x ) {

				return intersects;

			}

			intersects.push( {

				distance: distance,
				point: object.position,
				face: null,
				object: object

			} );

		} else if ( object instanceof THREE.Mesh ) {

			// Checking boundingSphere distance to ray
			sphere.set(
				object.matrixWorld.getPosition(),
				object.geometry.boundingSphere.radius* object.matrixWorld.getMaxScaleOnAxis() );

			if ( ! raycaster.ray.isIntersectionSphere( sphere ) ) {

				return intersects;

			}

			// Checking faces

			var geometry = object.geometry;
			var vertices = geometry.vertices;

			var isFaceMaterial = object.material instanceof THREE.MeshFaceMaterial;
			var objectMaterials = isFaceMaterial === true ? object.material.materials : null;

			var side = object.material.side;

			var a, b, c, d;
			var precision = raycaster.precision;

			object.matrixRotationWorld.extractRotation( object.matrixWorld );

			inverseMatrix.getInverse( object.matrixWorld );

			localRay.copy( raycaster.ray ).transformSelf( inverseMatrix );
	
			for ( var f = 0, fl = geometry.faces.length; f < fl; f ++ ) {

				var face = geometry.faces[ f ];

				var material = isFaceMaterial === true ? objectMaterials[ face.materialIndex ] : object.material;

				if ( material === undefined ) continue;

				side = material.side;

				facePlane.setFromNormalAndCoplanarPoint( face.normal, face.centroid );

				var planeDistance = localRay.distanceToPlane( facePlane );
	
				// bail if raycaster and plane are parallel
				if ( Math.abs( planeDistance ) < precision ) continue;
	
				// if negative distance, then plane is behind raycaster
				if ( planeDistance < 0 ) continue;

				var planeSign = localRay.direction.dot( facePlane.normal );

				if ( side === THREE.DoubleSide || ( side === THREE.FrontSide ? planeSign < 0 : planeSign > 0 ) ) {

					intersectPoint = localRay.at( planeDistance, intersectPoint ); // passing in intersectPoint avoids a copy

					if ( face instanceof THREE.Face3 ) {

						a = vertices[ face.a ];
						b = vertices[ face.b ];
						c = vertices[ face.c ];

						if ( pointInFace3( intersectPoint, a, b, c ) ) {

							var point = raycaster.ray.at( planeDistance );
							// Optimization: if input ray was guarrented to be normalized, we can just set distance = planeDistance
							distance = raycaster.ray.origin.distanceTo( point );

							if ( distance < raycaster.near || distance > raycaster.far ) continue;

							intersects.push( {

								distance: distance,
								point: point,
								face: face,
								faceIndex: f,
								object: object

							} );

						}

					} else if ( face instanceof THREE.Face4 ) {

						a = vertices[ face.a ];
						b = vertices[ face.b ];
						c = vertices[ face.c ];
						d = vertices[ face.d ];

						if ( pointInFace3( intersectPoint, a, b, d ) || pointInFace3( intersectPoint, b, c, d ) ) {

							var point = raycaster.ray.at( planeDistance );
							// Optimization: if input ray was guarrented to be normalized, we can just set distance = planeDistance
							distance = raycaster.ray.origin.distanceTo( point );

							if ( distance < raycaster.near || distance > raycaster.far ) continue;

							intersects.push( {

								distance: distance,
								point: point,
								face: face,
								faceIndex: f,
								object: object

							} );

						}

					}

				}

			}

		}

	};

	var intersectDescendants = function ( object, raycaster, intersects ) {

		var descendants = object.getDescendants();

		for ( var i = 0, l = descendants.length; i < l; i ++ ) {

			intersectObject( descendants[ i ], raycaster, intersects );

		}
	};

	//

	THREE.Raycaster.prototype.precision = 0.0001;

	THREE.Raycaster.prototype.set = function ( origin, direction ) {

		this.ray.set( origin, direction );

	};

	THREE.Raycaster.prototype.intersectObject = function ( object, recursive ) {

		var intersects = [];

		if ( recursive === true ) {

			intersectDescendants( object, this, intersects );

		}

		intersectObject( object, this, intersects );

		intersects.sort( descSort );

		return intersects;

	};

	THREE.Raycaster.prototype.intersectObjects = function ( objects, recursive ) {

		var intersects = [];

		for ( var i = 0, l = objects.length; i < l; i ++ ) {

			intersectObject( objects[ i ], this, intersects );

			if ( recursive === true ) {

				intersectDescendants( objects[ i ], this, intersects );

			}
		}

		intersects.sort( descSort );

		return intersects;

	};

}( THREE ) );
