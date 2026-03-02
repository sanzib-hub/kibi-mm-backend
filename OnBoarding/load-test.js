import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
    stages: [
        { duration: "10s", target: 2000 }, // ramp up to 20 users
        { duration: "30s", target: 200000 }, // stay at 20 users
        { duration: "10s", target: 0 },  // ramp down
    ],
};

export default function () {
    let res = http.get("http://localhost:4000/health");
    check(res, {
        "status is 200": (r) => r.status === 200,
    });
    sleep(1);
}