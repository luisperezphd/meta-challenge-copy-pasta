import * as htmlToImage from "html-to-image";
import html2canvas from "html2canvas";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

let worker: Tesseract.Worker;
promiseDoneCall(async () => {
  worker = await createWorker("eng");
});

function TypeText(props: { value: string; onDone: () => void; className?: string; style?: CSSProperties | undefined }) {
  const textRef = useRef("");
  const redraw = useRedrawComponent();
  const oldTargetValueRef = useRef<string>("");
  const targetValueRef = useRef<string>("");
  const isDoneRef = useRef(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (textRef.current.length < targetValueRef.current.length) {
        textRef.current = targetValueRef.current.substring(0, textRef.current.length + 1);
        redraw();
      } else {
        if (!isDoneRef.current) {
          isDoneRef.current = true;
          props.onDone();
          return;
        }
      }
    }, 80);

    return () => clearInterval(intervalId);
  }, [props.onDone]);

  useEffect(() => {
    if (props.value !== oldTargetValueRef.current) {
      oldTargetValueRef.current = props.value;
      targetValueRef.current = props.value;
      textRef.current = "";
      isDoneRef.current = false;
      redraw();
    }
  }, [props.value]);

  return (
    <div className={cn("whitespace-pre", props.className)} style={props.style}>
      {textRef.current}
    </div>
  );
}

export default function IndexPage() {
  const messageQueueRef = useRef<string[]>([]);
  const [message, setMessage] = useState("");

  const isWritingRef = useRef(false);

  const postMessage = useCallback((message: string) => {
    messageQueueRef.current.push(message);

    if (!isWritingRef.current) {
      isWritingRef.current = true;
      setMessage(messageQueueRef.current.shift() ?? "");
    }
  }, []);

  const BLENDER_POSITION = 65;
  const CLIPBOARD_POSITION = 0;

  const [blenderLeft, setBlenderLeft] = useState(BLENDER_POSITION);
  const [clipboardLeft, setClipboardLeft] = useState(CLIPBOARD_POSITION);

  const animateFight = useCallback(() => {
    promiseDoneCall(async () => {
      setClipboardLeft(CLIPBOARD_POSITION - 10);
      await delay(250);
      setClipboardLeft(CLIPBOARD_POSITION);
      await delay(4500);
      setBlenderLeft(BLENDER_POSITION + 10);
      await delay(250);
      setBlenderLeft(BLENDER_POSITION);
    });
  }, []);

  useEffect(() => {
    const handler = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;

      if (!items) {
        postMessage("CLIPBOARD tries\nto attack with\nempty clipboard.");
        return;
      }

      const itemMap = new Map<string, DataTransferItem>();
      for (const item of items) {
        itemMap.set(item.type, item);
      }

      if (itemMap.has("text/html")) {
        animateFight();
        postMessage(`CLIPBOARD does\na paste HTML\nattack.`);

        const item = nullthrows(itemMap.get("text/html"));
        const html = await getClipboardItemAsString(item);
        const { mimeType, blob } = await htmlToImageBlob(html);

        writeToClipboard([
          new ClipboardItem({
            [mimeType]: blob,
          }),
        ]);

        postMessage(`COPYPASTA counters\nwith an IMAGE\nattack.`);
      } else if (itemMap.has("text/plain")) {
        animateFight();
        postMessage(`CLIPBOARD executes\na plain text paste\nattack.`);
        const item = nullthrows(itemMap.get("text/plain"));
        const value = await getClipboardItemAsString(item);

        const html = value
          .split("")
          .map((o, i) => `<span style="color:${["red", "green", "blue"][i % 3]};backgroundColor:black">${o}</span>`)
          .join("");

        writeToClipboard([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
        postMessage("COPYPASTA responds\nwith an HTML\nattack.");
      } else if (itemMap.has("image/png")) {
        animateFight();
        postMessage(`CLIPBOARD pulls\noff a PNG image\nattack.....`);

        const item = nullthrows(itemMap.get("image/png"));
        const blob = nullthrows(item.getAsFile());
        const dataUrl = await blobToDataURL(blob);

        const ret = await worker.recognize(dataUrl);

        writeTextToClipboard(ret.data.text);

        postMessage("COPYPASTA\nretaliates with a\nplain text attack.");
      } else {
        postMessage(`CLIPBOARD does\nsome kind of\nunsupported attack.`);
        postMessage("COPYPASTA just\nstands there\n.");
      }
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, []);

  const [isClipboardVisible, setIsClipboardVisible] = useState(false);
  const [isBlenderVisible, setIsBlenderVisible] = useState(false);

  useEffect(() => {
    promiseDoneCall(async () => {
      await delay(1000);
      setIsClipboardVisible(true);
      await delay(1000);
      setIsBlenderVisible(true);
      await delay(1000);
      postMessage("\nPress Ctrl+V\nto Paste");
    });
  }, []);

  return (
    <Page>
      <div className="w-[500px] h-[500px] mx-auto block relative overflow-hidden">
        <img src="dist/battle-background.png" className="absolute left-0 top-0 w-full h-full" style={{ imageRendering: "pixelated" }} />
        {isBlenderVisible && (
          <>
            <img src="dist/character-blender.png" className="absolute left-0 top-0 w-[100px] transition-all " style={{ imageRendering: "pixelated", left: `${blenderLeft}%`, top: "1%" }} />
            <img src="dist/copy-pasa-hp.png" className="absolute left-0 top-0 w-full h-full" style={{ imageRendering: "pixelated" }} />
          </>
        )}
        {isClipboardVisible && (
          <>
            <img src="dist/character-clipboard.png" className="absolute left-0 top-0 w-[230px] transition-all" style={{ imageRendering: "pixelated", top: "33.5%", left: `${clipboardLeft}%` }} />
            <img src="dist/clipboard-hp.png" className="absolute left-0 top-0 w-full h-full" style={{ imageRendering: "pixelated" }} />
          </>
        )}
        {isBlenderVisible && (
          <>
            <div className="absolute" style={{ left: "6%", top: "1%", fontSize: "1.5rem" }}>
              COPYPASTA
            </div>
            <div className="absolute font-bold" style={{ left: "25%", top: "5.5%", fontSize: "1.5rem" }}>
              :L50
            </div>
          </>
        )}
        {isClipboardVisible && (
          <>
            <div className="absolute" style={{ left: "50%", top: "41%", fontSize: "1.5rem" }}>
              CLIPBOARD
            </div>
            <div className="absolute font-bold" style={{ left: "70%", top: "46%", fontSize: "1.5rem" }}>
              :L50
            </div>
            <div className="absolute" style={{ left: "56%", top: "55%", fontSize: "1.5rem" }}>
              178/178
            </div>
          </>
        )}
        <TypeText
          value={message}
          className="absolute"
          style={{ left: "6%", top: "71%", fontSize: "1.5rem" }}
          onDone={async () => {
            await delay(1000);
            if (messageQueueRef.current.length > 0) {
              setMessage(messageQueueRef.current.shift() ?? "");
            } else {
              isWritingRef.current = false;
            }
          }}
        />
      </div>
    </Page>
  );
}

function dataURLToBlob(dataUrl: string): { mimeType: string; blob: Blob } {
  // Decode the Data URL to get the raw data and the MIME type
  const parts = dataUrl.split(",");
  const base64Data = parts[1];
  const mimeType = parts[0].split(":")[1].split(";")[0];

  // Decode base64 data
  const byteString = atob(base64Data);

  // Convert decoded data to a typed array
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const intArray = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    intArray[i] = byteString.charCodeAt(i);
  }

  // Create a Blob from the typed array and return it
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return { mimeType, blob };
}

function noop() {
  // do nothing
}

function promiseDoneCall<T>(fn: () => Promise<T>): void {
  promiseDone(fn());
}

function promiseDone<T>(promise: Promise<T>): void {
  const invokeAtError = new Error();
  promise.then(noop).catch((e) => {
    console.log("promiseDoneCall exception", e, invokeAtError.stack);
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canvasToBlob(canvas: HTMLCanvasElement, type?: string, quality?: any): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      type,
      quality
    );
  });
}

function nullthrows<T>(value: T | null | undefined, message?: string): T {
  if (value == null) {
    throw new Error("nullthrows: " + (message ?? "value is null or undefined"));
  }

  return value;
}

async function htmlToImageBlob(html: string, method: "html2canvas" | "html-to-image" = "html-to-image") {
  const container = document.createElement("div");

  const hideContainer = true;
  const removeContainer = true;

  document.body.appendChild(container);
  if (hideContainer) {
    container.style.position = "absolute";
    container.style.left = "-1000px";
    container.style.top = "-1000px";
  }

  const tempElm = document.createElement("div");
  tempElm.style.display = "inline-block";
  tempElm.innerHTML = html;
  container.appendChild(tempElm);

  delay(0);

  try {
    switch (method) {
      case "html-to-image":
        const dataUrl = await htmlToImage.toPng(tempElm);
        return await dataURLToBlob(dataUrl);
      case "html2canvas": {
        const rect = tempElm.getBoundingClientRect();

        const canvas = await html2canvas(tempElm, {
          width: rect.width,
          height: rect.height,
        });
        tempElm.remove();
        const mimeType = "image/png";
        const blob = nullthrows(await canvasToBlob(canvas, mimeType));
        return { mimeType, blob };
      }
      default:
        throw new Error("Invalid method: " + method);
    }
  } finally {
    if (removeContainer) {
      container.remove();
    }
  }
}

function normalizeError(e: any): Error {
  if (typeof e === "object" && !Object.hasOwn(e, "stack")) {
    return new Error(String(e));
  }

  return e;
}

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    var fr = new FileReader();
    fr.addEventListener("load", (e) => {
      resolve(e.target?.result as string);
    });
    fr.readAsDataURL(blob);
  });
}

function Page(props: { children: React.ReactNode }) {
  return <div className="p-8">{props.children}</div>;
}

async function writeToClipboard(data: ClipboardItems): Promise<void> {
  try {
    await navigator.clipboard.write(data);
  } catch (e) {
    throw normalizeError(e);
  }
}

async function writeTextToClipboard(data: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(data);
  } catch (e) {
    throw normalizeError(e);
  }
}

function getClipboardItemAsString(clipboardItem: DataTransferItem): Promise<string> {
  return new Promise((resolve) => {
    clipboardItem.getAsString(resolve);
  });
}

function useRedrawComponent() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((tick) => tick + 1), []);
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
