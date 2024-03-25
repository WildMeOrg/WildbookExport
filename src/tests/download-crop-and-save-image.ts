import { downloadCropAndSaveImage } from "../utils";

downloadCropAndSaveImage(
  "https://africancarnivore.wildbook.org/wildbook_data_dir/3/0/309d8622-daef-4ee7-93e4-628141a988b9/T4C20230923BenSeager1622765ff96b544318d88f41dc0383aea.jpg",
  [4, 0, 679, 1024],
  "/tmp/xyz.jpg",
);

downloadCropAndSaveImage(
  "https://africancarnivore.wildbook.org/wildbook_data_dir/3/0/309d8622-daef-4ee7-93e4-628141a988b9/T4C20230923BenSeager1622765ff96b544318d88f41dc0383aea.jpg",
  [68, 63, 586, 566],
  "/tmp/xyz2.jpg",
);
