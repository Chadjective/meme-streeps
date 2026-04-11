const IMAGE_PATHS = [
  '/images/streep-01.jpg',
  '/images/streep-02.jpg',
  '/images/streep-03.jpg',
  '/images/streep-04.jpg',
  '/images/streep-05.jpg',
  '/images/streep-06.jpg',
  '/images/streep-07.jpg',
  '/images/streep-08.jpg',
  '/images/streep-09.jpg',
  '/images/streep-10.jpg',
  '/images/streep-11.jpg',
  '/images/streep-12.jpg',
  '/images/streep-13.jpg',
  '/images/streep-14.jpg',
  '/images/streep-15.jpg',
  '/images/streep-16.jpg',
  '/images/streep-17.jpg',
  '/images/streep-18.jpg',
  '/images/streep-19.jpg',
  '/images/streep-20.jpg',
  '/images/streep-21.jpg',
  '/images/streep-22.jpg',
];

let lastImageIndex = -1;

export function getRandomImage(): string {
  if (IMAGE_PATHS.length === 0) return '';
  let index: number;
  do {
    index = Math.floor(Math.random() * IMAGE_PATHS.length);
  } while (index === lastImageIndex && IMAGE_PATHS.length > 1);
  lastImageIndex = index;
  return IMAGE_PATHS[index];
}

export function hasImages(): boolean {
  return IMAGE_PATHS.length > 0;
}
