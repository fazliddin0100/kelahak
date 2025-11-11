// models/Device.ts
import mongoose, {Document, Model} from "mongoose";

export interface IDevice {
    mac: string;
    ip: string;
    hostname?: string;
    note?: string;
    lastSeen?: Date;
}

export interface IDeviceDocument extends IDevice, Document {
}

const MAC_REGEX =
    /^([0-9A-Fa-f]{2}([-:])){5}([0-9A-Fa-f]{2})$|^[0-9A-Fa-f]{12}$/; // XX:XX:XX:XX:XX:XX or XXXXXXXXXXXX
const IPV4_REGEX =
    /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
const IPV6_REGEX =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1)$/; // simple check (not full exhaustive IPv6)

const DeviceSchema = new mongoose.Schema<IDeviceDocument>(
    {
        mac: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            match: MAC_REGEX,
            unique: true,
            index: true,
        },
        ip: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: function (v: string) {
                    return IPV4_REGEX.test(v) || IPV6_REGEX.test(v);
                },
                message: (props: any) => `${props.value} is not a valid IP address`,
            },
        },
        hostname: {type: String, trim: true},
        note: {type: String, trim: true},
        lastSeen: {type: Date, default: Date.now},
    },
    {timestamps: true}
);

// Avoid model overwrite issue in serverless / hot-reload
const modelName = "Device";
const Device: Model<IDeviceDocument> =
    (mongoose.models[modelName] as Model<IDeviceDocument>) ||
    mongoose.model<IDeviceDocument>(modelName, DeviceSchema);

export default Device;
