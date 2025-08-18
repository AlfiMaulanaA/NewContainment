"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Download, Box } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function Rack3DViewer() {
  // Use a ref to get a reference to the canvas element
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Pastikan canvas sudah tersedia sebelum melanjutkan
    if (!canvasRef.current) return;

    // Set up the scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true, // Make the background transparent
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Add ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Group to hold all containment objects so they rotate together
    const containmentGroup = new THREE.Group();
    scene.add(containmentGroup);

    // Create two rows of racks facing each other
    const numRacks = 4;
    const rackWidth = 2; // Defined rack width
    const rackDepth = 1.5; // Defined rack depth
    const rackSpacing = rackWidth + 0.1; // Make the gap between racks very small
    const rowSpacing = rackDepth * 2; // Gap between rows is 2x rack depth

    const rackGeometry = new THREE.BoxGeometry(rackWidth, 4, rackDepth);
    const rackMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c, // Dark gray for a sleek look
      metalness: 0.8,
      roughness: 0.5,
    });
    const slotMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, // Even darker for contrast
      metalness: 0.9,
      roughness: 0.6,
    });

    for (let i = 0; i < numRacks; i++) {
      // First row of racks
      const rack1 = new THREE.Mesh(rackGeometry, rackMaterial);
      rack1.position.set(
        i * rackSpacing - ((numRacks - 1) / 2) * rackSpacing,
        0,
        -rowSpacing / 2
      );
      containmentGroup.add(rack1);
      // Add server slots
      for (let j = 0; j < 5; j++) {
        const slot = new THREE.Mesh(
          new THREE.BoxGeometry(rackWidth - 0.2, 0.2, rackDepth - 0.1),
          slotMaterial
        );
        slot.position.y = 1.5 - j * 0.7;
        rack1.add(slot);
      }

      // Second row of racks
      const rack2 = new THREE.Mesh(rackGeometry, rackMaterial);
      rack2.position.set(
        i * rackSpacing - ((numRacks - 1) / 2) * rackSpacing,
        0,
        rowSpacing / 2
      );
      rack2.rotation.y = 0; // Rotate to face the same direction as the first row
      containmentGroup.add(rack2);
      // Add server slots
      for (let j = 0; j < 5; j++) {
        const slot = new THREE.Mesh(
          new THREE.BoxGeometry(rackWidth - 0.2, 0.2, rackDepth - 0.1),
          slotMaterial
        );
        slot.position.y = 1.5 - j * 0.7;
        rack2.add(slot);
      }
    }

    // Create transparent roof for the corridor
    const roofGeometry = new THREE.BoxGeometry(
      (numRacks - 1) * rackSpacing + rackWidth + 0.5,
      0.1,
      rowSpacing + 0.5
    );
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x5882fa,
      transparent: true,
      opacity: 0.2,
      roughness: 0.2,
      metalness: 0.2,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 2.2;
    containmentGroup.add(roof);

    // Create front and back sliding doors
    const doorGeometry = new THREE.BoxGeometry(
      (numRacks - 1) * rackSpacing + rackWidth + 0.5,
      4.5,
      0.1
    );
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x5882fa,
      transparent: true,
      opacity: 0.2,
      roughness: 0.2,
      metalness: 0.2,
    });

    const frontDoor = new THREE.Mesh(doorGeometry, doorMaterial);
    frontDoor.position.z = -rowSpacing / 2 - rackDepth / 2 - 0.1;
    frontDoor.position.y = 0;
    containmentGroup.add(frontDoor);

    const backDoor = new THREE.Mesh(doorGeometry, doorMaterial);
    backDoor.position.z = rowSpacing / 2 + rackDepth / 2 + 0.1;
    backDoor.position.y = 0;
    containmentGroup.add(backDoor);

    camera.position.z = 10;
    camera.position.y = 2;

    // Variables for mouse interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    // Function to handle window resizing
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Animation loop to render the scene
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    // Mouse event listeners for rotation
    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition.x = e.clientX;
      previousMousePosition.y = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !canvasRef.current) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      containmentGroup.rotation.y += deltaX * 0.005;
      containmentGroup.rotation.x += deltaY * 0.005;

      previousMousePosition.x = e.clientX;
      previousMousePosition.y = e.clientY;
    };

    // Touch event listeners for rotation on mobile
    const handleTouchStart = (e: TouchEvent) => {
      isDragging = true;
      const touch = e.touches[0];
      previousMousePosition.x = touch.clientX;
      previousMousePosition.y = touch.clientY;
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0 || !canvasRef.current) return;
      const touch = e.touches[0];

      const deltaX = touch.clientX - previousMousePosition.x;
      const deltaY = touch.clientY - previousMousePosition.y;

      containmentGroup.rotation.y += deltaX * 0.005;
      containmentGroup.rotation.x += deltaY * 0.005;

      previousMousePosition.x = touch.clientX;
      previousMousePosition.y = touch.clientY;
    };

    // Add event listeners
    window.addEventListener("resize", handleResize);
    canvasRef.current.addEventListener("mousedown", handleMouseDown);
    canvasRef.current.addEventListener("mouseup", handleMouseUp);
    canvasRef.current.addEventListener("mousemove", handleMouseMove);
    canvasRef.current.addEventListener("touchstart", handleTouchStart);
    canvasRef.current.addEventListener("touchend", handleTouchEnd);
    canvasRef.current.addEventListener("touchmove", handleTouchMove);

    // Start the animation loop
    animate();
    handleResize();

    // Cleanup function to remove event listeners on unmount
    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("mousedown", handleMouseDown);
        canvasRef.current.removeEventListener("mouseup", handleMouseUp);
        canvasRef.current.removeEventListener("mousemove", handleMouseMove);
        canvasRef.current.removeEventListener("touchstart", handleTouchStart);
        canvasRef.current.removeEventListener("touchend", handleTouchEnd);
        canvasRef.current.removeEventListener("touchmove", handleTouchMove);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5" />
          <h1 className="text-lg font-semibold">3D Rack Viewer</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col p-0 items-center justify-center">
        <div className="w-full h-full">
          <canvas ref={canvasRef} className="w-full h-full rounded-none" />
        </div>
      </div>
    </SidebarInset>
  );
}
