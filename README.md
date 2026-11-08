This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).


## About
One day it was really hot out and I wanted to know if it could possibly be hotter anywhere else in the
country. I tried to google it but there weren't any good results! Then I went down the weather data API
rabbit hole... Here's my attempt


**Might be deployed here at any given time...**

https://hottest-place-next.vercel.app/



## How does it work?
`GET /api/hottest-place` (`src/lib/hottest.ts`) combines three NOAA sources:

1. **RTMA (Real-Time Mesoscale Analysis)**: NOAA's best-estimate temperature map on a 2.5 km grid,
   blending a short-range model with station observations. The CONUS Rapid Update runs every
   15 minutes; Hawaii runs hourly. We pull only the 2 m temperature field (~6 MB) from the
   [AWS mirror](https://registry.opendata.aws/noaa-rtma/) with an HTTP range request and decode it
   ourselves (`src/lib/rtma/`).
2. **MADIS**: ~20k QC-filtered surface stations (ASOS/AWOS, RAWS, state mesonets, MesoWest, CWOP…)
   from the [public text interface](https://madis-data.ncep.noaa.gov/public/sfcdumpguest.html).
   A station is trusted only if it agrees with RTMA at its own grid cell (within 1.5 K), which
   drops badly sited sensors.
3. **NWS API**: names the nearest place to the result (`api.weather.gov/points`).

The hot spot is the hottest US land cell within 15 km of a trusted station that reads at least
about as hot (within 1 K). Raw RTMA maxima often sit in data voids or on coasts, where the
analysis reads close to sea temperature; requiring a thermometer keeps the answer tied to a real
measurement. If MADIS is down, the raw RTMA maximum is shown with a warning.

The response is cached at the CDN for 5 minutes with stale-while-revalidate, so visitors don't
wait on the ~15–25 s MADIS query.

#### Land mask
`src/lib/rtma/landmask-data.ts` marks which grid cells count as US land. It's generated from the
Census state boundaries plus RTMA's own terrain field; see `scripts/build-landmask.mts` for how to
regenerate it. The API errors loudly if NOAA ever changes the grid.

#### Data terms
MADIS mesonet providers ask that you notify the MADIS team before showing their data on a public
web page, credit the source, and include a disclaimer; the page footer does the last two.

---

This page was made possible due to the data made available through the National Oceanic and Atmospheric Administration

---

