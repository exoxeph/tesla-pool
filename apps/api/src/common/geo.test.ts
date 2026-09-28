import { TEST_ZONES } from "./__fixtures__/zones.fixture";
import { equirectangularDistanceKm, zonesAreCompatible } from "./geo";

describe("equirectangularDistanceKm", () => {
  it("returns ~2.43 km for Mohakhali <-> Gulshan 1", () => {
    const distance = equirectangularDistanceKm(
      TEST_ZONES.Mohakhali,
      TEST_ZONES["Gulshan 1"]
    );
    expect(distance).toBeCloseTo(2.43, 1);
  });
});

describe("zonesAreCompatible", () => {
  it("returns true for Nusrat's (Banani->Mohakhali) and Rafiq's (Banani->Gulshan 1) actual trips", () => {
    const compatible = zonesAreCompatible(
      TEST_ZONES.Banani,
      TEST_ZONES.Mohakhali,
      TEST_ZONES.Banani,
      TEST_ZONES["Gulshan 1"]
    );
    expect(compatible).toBe(true);
  });

  it("returns false for Banani->X vs Farmgate->Y (~4.55 km pickup distance)", () => {
    const pickupDistance = equirectangularDistanceKm(
      TEST_ZONES.Banani,
      TEST_ZONES.Farmgate
    );
    expect(pickupDistance).toBeCloseTo(4.55, 1);

    const compatible = zonesAreCompatible(
      TEST_ZONES.Banani,
      TEST_ZONES.Mohakhali,
      TEST_ZONES.Farmgate,
      TEST_ZONES.Uttara
    );
    expect(compatible).toBe(false);
  });
});
