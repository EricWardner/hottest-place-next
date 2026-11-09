This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).


## About
One day it was really hot out and I wanted to know if it could possibly be hotter anywhere else in the
country. I tried to google it but there weren't any good results! Then I went down the weather data API
rabbit hole... Here's my attempt


**Might be deployed here at any given time...**

https://hottest-place-next.vercel.app/



## How does it work?
The home page (`src/app/page.tsx`) shows the hottest or the coldest place, with a toggle (shareable
as `#coldest`). It's rendered on the server from `src/lib/extremes.ts`, which combines three NOAA
sources:

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
about as hot (within 1 K); the cold spot is the mirror image. Raw RTMA extremes often sit in data
voids, on unmonitored peaks, or on coasts where the analysis reads close to sea temperature;
requiring a thermometer keeps the answer tied to a real measurement. One refresh computes both.

Coverage is the lower 48 plus Hawaii. Alaska is left out on purpose: it would be the coldest place
almost every day.

#### Caching (Vercel Hobby)
The page uses Incremental Static Regeneration (`revalidate = 300`). Visitors always get the cached
page instantly instead of waiting on the ~15–25 s NOAA/MADIS fetch. Once the page is older than
5 minutes, the next visit triggers a background refresh. Nothing runs on a schedule (Hobby cron
jobs are daily only), so after a quiet stretch the first visitor may see an old result; the page
shows its age and swaps in the new data once the background refresh lands. An open tab checks for
a newer page every 5 minutes while visible, and when you switch back to it.

MADIS is the flaky source (slow replies, empty tables, HTTP 403s). If it fails for the lower 48,
the refresh still succeeds with RTMA's own extremes, labeled as unconfirmed estimates, rather than
freezing the page on an old answer. Only missing lower-48 RTMA makes a refresh throw, in which
case the last good page keeps being served. A Hawaii failure only drops Hawaii, with a note on the
page. If the NWS place lookup fails, the page shows coordinates instead of a town. Warnings go to
the runtime logs. The build also runs the pipeline once; if it has no data at all there, it
renders a placeholder rather than failing the deploy.

#### Land mask
`src/lib/rtma/landmask-data.ts` marks which grid cells count as US land. It's generated from the
Census state boundaries plus RTMA's own terrain field; see `scripts/build-landmask.mts` for how to
regenerate it. Rendering errors loudly if NOAA ever changes the grid.

#### Development
Requires Node 26 (`engines` in `package.json`). `npm run dev`, `npm run build`, `npm run lint`.

#### Data terms
MADIS mesonet providers ask that you notify the MADIS team before showing their data on a public
web page, credit the source, and include a disclaimer; the page footer does the last two.

---

This page was made possible due to the data made available through the National Oceanic and Atmospheric Administration

---

