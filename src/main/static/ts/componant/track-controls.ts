import { TRACK_CONTROLS } from "../util/constants";
import { Logger } from "../util/logger";

type Capabilities = Partial<{
  [K in keyof typeof TRACK_CONTROLS]: (typeof TRACK_CONTROLS)[K]["sample"];
}>;

type SettingValue<T> = T extends boolean
  ? boolean
  : T extends readonly (infer U)[]
    ? U
    : T extends { min: number; max: number }
      ? number
      : never;

type Settings = Partial<{
  [K in keyof Capabilities]: SettingValue<Capabilities[K]>;
}>;

const logger = new Logger("TrackControls");
export class TrackControls {
  private capabilities: Capabilities;
  private settings: Settings;
  private applyConstraints?: (
    constrains: MediaTrackConstraints,
  ) => Promise<MediaTrackSettings>;

  private controls: Partial<
    Record<keyof Capabilities, HTMLInputElement | HTMLSelectElement>
  > = {};

  constructor(
    capabilities: MediaTrackCapabilities,
    settings: MediaTrackSettings,
  ) {
    this.capabilities = capabilities as Capabilities;
    this.settings = settings as Settings;

    logger.debug("instance created");
  }

  setApplyConstraintsListener(
    listener?: (
      constrains: MediaTrackConstraints,
    ) => Promise<MediaTrackSettings>,
  ) {
    logger.debug("setApplyConstraintsListener called");
    this.applyConstraints = listener;
  }

  updateSettings(settings: Settings) {
    logger.debug("updateSettings called:", settings);
    this.settings = { ...this.settings, ...settings };

    for (const key in settings) {
      const control = this.controls[key as keyof Settings];
      const value = settings[key as keyof Settings];

      if (!control || value == null) continue;

      if (control instanceof HTMLInputElement && control.type === "checkbox") {
        control.checked = Boolean(value);
      } else if (
        control instanceof HTMLInputElement &&
        control.type === "range"
      ) {
        control.value = String(value);
        const label = control.nextElementSibling as HTMLSpanElement | null;
        if (label) label.textContent = String(value);
      } else if (control instanceof HTMLSelectElement) {
        control.value = String(value);
      }
    }

    this.updateDependencies();
  }

  private async handleChange<K extends keyof Settings>(
    capability: K,
    value: Settings[K],
  ) {
    logger.debug("handleChange called:", capability, value);

    if (!this.applyConstraints) return;
    const control = this.controls[capability];
    if (!control) return;

    control.disabled = true;
    try {
      const updated = (await this.applyConstraints({
        advanced: [{ ...this.settings, [capability]: value } as any], // TODO: group constrains and apply the group
      })) as Settings;
      if (updated) this.updateSettings(updated);
    } catch (err) {
      logger.error("applyConstraints failed:", err);
    } finally {
      control.disabled = false;
    }
  }

  updateDependencies() {
    logger.debug("updateDependencies called");
    for (const key in TRACK_CONTROLS) {
      const config = TRACK_CONTROLS[key as keyof typeof TRACK_CONTROLS];
      if (!("dependsOn" in config && config.dependsOn)) continue;

      const [depKey, depValue] = Object.entries(config.dependsOn)[0];
      const enabled = this.settings[depKey as keyof Settings] === depValue;

      const control = this.controls[key as keyof Settings];
      if (control) {
        control.disabled = !enabled;
        const parentElement = control.parentElement;
        if (parentElement) parentElement.style.opacity = enabled ? "1" : "0.4";
      }
    }
  }

  getControlDiv(capability: keyof Capabilities): HTMLDivElement {
    logger.debug("getControlDiv called:", capability);

    const div = document.createElement("div");
    const config = TRACK_CONTROLS[capability];
    const capValue = this.capabilities[capability];
    if (!config || !capValue) return div;

    const label = document.createElement("label");
    label.textContent = `${config.label}: `;

    if (typeof capValue === "boolean") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!this.settings[capability];
      input.onchange = () => this.handleChange(capability, input.checked);
      this.controls[capability] = input;
      div.append(label, input);
    } else if (Array.isArray(capValue)) {
      const select = document.createElement("select");
      capValue.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      select.value = String(this.settings[capability] ?? "");
      select.onchange = () =>
        this.handleChange(capability, select.value as any);
      this.controls[capability] = select;
      div.append(label, select);
    } else if (
      typeof capValue === "object" &&
      "min" in capValue &&
      "max" in capValue
    ) {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "8px";

      const input = document.createElement("input");
      input.style.width = "50%";
      input.type = "range";
      input.min = String(capValue.min);
      input.max = String(capValue.max);
      input.step =
        "step" in capValue
          ? String(capValue.step ?? 1)
          : String((capValue.max - capValue.min) / 100);
      const initialValue =
        (this.settings[capability] as number | undefined) ?? capValue.min;
      input.value = String(initialValue);

      const valueLabel = document.createElement("span");
      valueLabel.textContent = String(initialValue);
      valueLabel.style.minWidth = "50px";
      valueLabel.style.fontFamily = "monospace";

      input.oninput = () => {
        valueLabel.textContent = input.value;
      };
      input.onchange = () => this.handleChange(capability, Number(input.value));
      this.controls[capability] = input;

      wrapper.append(input, valueLabel);
      div.append(label, wrapper);
    } else {
      logger.warn("unknwon capability type:", capValue);
    }

    return div;
  }
}
