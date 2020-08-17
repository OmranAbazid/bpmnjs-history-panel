import React, { useEffect, useRef, useState } from "react";
import classnames from "classnames";

import inherits from "inherits";
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";

import Modeler from "bpmn-js/lib/Modeler";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";

import "./App.scss";

const names = {
  "shape.create": "shape created",
  "shape.move": "shape moved",
  "shape.delete": "shape deleted",
  "label.create": "label created",
  "shape.resize": "shape resized",
  "connection.create": "connection created",
  "connection.layout": "connection moved",
  "connection.updateWaypoints": "connection updateWaypoints",
};

export default () => {
  const container = useRef();
  const viewer = useRef();
  const triggered = useRef([]);
  const [events, setEvents] = useState([]);
  const eventsRef = useRef(events);

  const [index, setIndex] = useState(-1);
  const indexRef = useRef(index);

  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState();

  const id = "Process_" + Math.random().toString(36).substr(2);
  const [xml, setXML] = useState(`<?xml version="1.0" encoding="UTF-8"?>
  <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_15hceqv" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="3.4.1">
    <bpmn:process id="${id}" name="test" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
    </bpmn:process>
    <bpmndi:BPMNDiagram id="BPMNDiagram_1">
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${id}">
        <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
          <dc:Bounds x="179" y="99" width="36" height="36" />
        </bpmndi:BPMNShape>
      </bpmndi:BPMNPlane>
    </bpmndi:BPMNDiagram>
  </bpmn:definitions>`);

  useEffect(() => {
    if (viewer.current) {
      viewer.current.detach();
      viewer.current = null;
    }
    function CommandLogger(eventBus) {
      CommandInterceptor.call(this, eventBus);

      this.preExecute((evt) => {
        triggered.current.push(evt.command);
      });

      Object.keys(names).forEach((trigger) =>
        this.postExecute(trigger, CommandLogger.on)
      );
    }

    CommandLogger.on = async (event) => {};

    inherits(CommandLogger, CommandInterceptor);

    CommandLogger.$inject = ["eventBus"];

    viewer.current = new Modeler({
      container: container.current,
      additionalModules: [
        {
          __init__: ["CommandLogger"],
          CommandLogger: ["type", CommandLogger],
        },
      ],
    });

    viewer.current.importXML(xml);

    const eventBus = viewer.current.get("eventBus");

    eventBus.on("commandStack.changed", async () => {
      const targetEvent =
        triggered.current.filter((name) =>
          Object.keys(names).includes(name)
        )[0] || "diagram changed";

      const { xml } = await viewer.current.saveXML();
      eventsRef.current = [
        ...eventsRef.current.slice(0, indexRef.current + 1),
        { name: targetEvent, xml },
      ];
      setEvents(eventsRef.current);
      indexRef.current = indexRef.current + 1;
      setIndex(indexRef.current);
      triggered.current = [];
      const activeElement = document.querySelector(".active");
      if (activeElement) {
        activeElement.scrollIntoView();
      }
    });
  }, [xml]);

  return (
    <div className="App">
      <div className="card history">
        <div className="card-body">
          {snapshots.map(({ name, xml }, i) => (
            <li
              key={i}
              className={classnames("list-group-item", {
                active: i === selectedSnapshot,
              })}
              onClick={async () => {
                setSelectedSnapshot(i);
                setIndex(-1);
                setXML(xml);
              }}
            >
              {name}
              <button
                onClick={(evt) => {
                  evt.stopPropagation();
                  const hiddenElement = document.createElement("a");
                  hiddenElement.setAttribute(
                    "href",
                    "data:text/plain;charset=utf-8, " + encodeURIComponent(xml)
                  );
                  hiddenElement.download = "test.bpmn";
                  hiddenElement.click();
                }}
                className="btn"
              >
                <svg
                  width="1em"
                  height="1em"
                  viewBox="0 0 16 16"
                  className="bi bi-download"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M.5 8a.5.5 0 0 1 .5.5V12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5a.5.5 0 0 1 1 0V12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V8.5A.5.5 0 0 1 .5 8z"
                  />
                  <path
                    fillRule="evenodd"
                    d="M5 7.5a.5.5 0 0 1 .707 0L8 9.793 10.293 7.5a.5.5 0 1 1 .707.707l-2.646 2.647a.5.5 0 0 1-.708 0L5 8.207A.5.5 0 0 1 5 7.5z"
                  />
                  <path
                    fillRule="evenodd"
                    d="M8 1a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0v-8A.5.5 0 0 1 8 1z"
                  />
                </svg>
              </button>
              <button
                onClick={(evt) => {
                  evt.stopPropagation();
                  setSelectedSnapshot();
                  setSnapshots(snapshots.filter((snap) => snap.name !== name));
                  setIndex(events.length - 1);
                  setXML(events[events.length - 1].xml);
                }}
                className="btn"
              >
                <svg
                  width="1em"
                  height="1em"
                  viewBox="0 0 16 16"
                  className="bi bi-trash-fill"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5a.5.5 0 0 0-1 0v7a.5.5 0 0 0 1 0v-7z"
                  />
                </svg>
              </button>
            </li>
          ))}
          <h5 className="card-title">history</h5>
          <ul className="list-group">
            {events.map(({ name, xml }, i) => (
              <li
                key={i}
                className={classnames("list-group-item", {
                  active: i === index && !selectedSnapshot,
                })}
                onClick={async () => {
                  setSelectedSnapshot();
                  setIndex(i);
                  indexRef.current = i;
                  setXML(xml);
                }}
              >
                {names[name]}
              </li>
            ))}
          </ul>
        </div>
        <button
          disabled={events.length === 0}
          onClick={() => {
            setSnapshots([
              ...snapshots,
              {
                name: "Snapshot " + (snapshots.length + 1),
                xml: events[index].xml,
              },
            ]);
          }}
          className="btn btn-primary"
        >
          <svg
            width="1em"
            height="1em"
            viewBox="0 0 16 16"
            className="bi bi-camera-fill"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
            <path
              fillRule="evenodd"
              d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"
            />
          </svg>
        </button>
      </div>
      <div className="container" ref={container} />
    </div>
  );
};
