# Test fixtures

Drop a few real JPEGs here for the Playwright E2E upload flow:

- `valid-garbage.jpg` — an outdoor photo of garbage/waste
- `valid-pothole.jpg` — an outdoor photo of a road pothole

The unit and API tests mock Claude and do not need these images. The E2E
`file-page` upload test skips automatically when `valid-garbage.jpg` is absent,
so the suite stays green without them — add the images to exercise the full
capture → classify flow.
