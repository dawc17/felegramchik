import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { client } from "./lib/appwrite";
import { AppwriteException } from "appwrite";
import AppwriteSvg from "../public/appwrite.svg";
import ReactSvg from "../public/react.svg";

function App() {
  return <div className="bg-amber-400">Hello World</div>;
}

export default App;
