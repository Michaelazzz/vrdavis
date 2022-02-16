import { useRef, useState } from 'react'
import { 
  VRCanvas, 
  DefaultXRControllers, 
  // Interactive, 
  RayGrab,
  useController,
  // useXRFrame,
  // useXR
} from '@react-three/xr'
import { useFrame } from "@react-three/fiber"
import { Box, Text, Plane, OrbitControls } from '@react-three/drei'

import * as THREE from "three"
import { DoubleSide } from "three"

function HandMenu () {
  const ref = useRef() // reference for hand mounted menu
  const leftController = useController("left")

  const [logs, setLog] = useState(['Hand Menu Log:'])

  // add to log
  const addLog = (log) => {
    console.log(log)
    logs.slice(1).slice(-5)
    setLog([...logs, log])
  }

  useFrame((state) => {
    if(!leftController) {
      // addLog('Left hand controller is unavailable')
      return
    }
    else
    {
      addLog('Left hand controller is available')
    }

    const { grip: controller } = leftController
    const offset = new THREE.Vector3(0,0,-0.175)
    // const position =  new THREE.Vector3().copy(controller.position)
    ref.current.position.copy(controller.position).add(offset)
    addLog(ref.current.position)
    ref.current.quaternion.copy(controller.position)
  })

  return (
    <group>
      {/* hand menu log  */}
      <group
        position={[1, 2, -1]}
      >
        {logs.map((log, index) => (
          <Text
            key={index}
            position={[1, 0.1*(index+1), 0]}
          >
            {log}
          </Text>
        ))}
        
      </group>
      <Box 
        ref={ref}
        position={[-0.05, 0.37, 0.3]}
        scale={[0.5,0.5,0.5]}
      >
        <meshStandardMaterial color="#FDC5F5" />
      </Box>


    </group>
    
  )
}

function App() {

  // const { controllers } = useXR()

  // XR events
  // useXREvent('select', (e) => addLog('select event has been triggered'))
  // useXREvent('selectstart', (e) => addLog('select event has started'))
  // useXREvent('selectend', (e) => addLog('select event has ended'))
  // useXREvent('squeeze', (e) => addLog('squeeze event has been triggered'))
  // useXREvent('squeezestart', (e) => addLog('squeeze event has started'))
  // useXREvent('squeezeeend', (e) => addLog('squeeze event has ended'))

  const [logs, setLog] = useState(['Environment Log:'])

  // add to log
  const addLog = (log) => {
    console.log(log)
    logs.slice(1).slice(-5)
    setLog([...logs, log])
  }

  return (
    <>
      <VRCanvas>
        {/* background */}
        <color attach="background" args={["#DBE9EE"]} />
        {/* lighting */}
        <ambientLight intensity={0.5}/>
        <spotLight position={[2,2,2]}/>

        {/* controls */}
        <DefaultXRControllers />
        {/* <OrbitControls /> */}

        {/* environment log  */}
        <group
          position={[-1, 2, -1]}
        >
          {logs.map((log, index) => (
            <Text
              key={index}
              position={[1, 0.1*(index+1), 0]}
            >
              {log}
            </Text>
          ))}
          
        </group>
        
        {/* <Interactive>
          <Box position={[-1,0,-1]}>
            <meshStandardMaterial color="#e23" />
          </Box>
        </Interactive> */}

        <RayGrab
          onSelect={() => addLog('click')} 
          onHover={() => addLog('hover')} 
          onBlur={() => addLog('blur')}
        >
          <Box position={[1,0.5,-1]}>
            <meshStandardMaterial color="#E23" />
          </Box>
        </RayGrab>
        
        <Plane
          position={[0,0,0]}
          rotation={[Math.PI / 2, 0, 0]} 
          scale={[10, 10, 10]}
        >
          <meshBasicMaterial color="#C0D6DF" side={DoubleSide} />
        </Plane>

        <HandMenu />

      </VRCanvas>
    </>
  );
}

export default App;
