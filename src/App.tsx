import React from "react";
import {VRCanvas, DefaultXRControllers, Interactive} from "@react-three/xr";
import {Box, Plane} from "@react-three/drei";
import * as THREE from "three";

import HandMenu from "./components/HandMenu";
import DataObject from "./components/DataObject";

function App() {
    return (
        <>
            <VRCanvas>
                <color attach="background" args={["#DBE9EE"]} />
                <Plane position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 10]}>
                    <meshBasicMaterial color="#C0D6DF" side={THREE.DoubleSide} />
                </Plane>

                <DefaultXRControllers />

                <HandMenu />

                <DataObject/>
                
            </VRCanvas>
        </>
    );
}

export default App;
