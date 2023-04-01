## Reinforced Concrete Beam Designer as per ACI 318-19 (Imperial)

Calculate the required flexural and shear reinforcement for a rectangular beam and get the corresponding beam schedule in just few clicks!

## Assumptions:
### Flexure Reinforcements:
Calculating for the required no. of main reinforcement, the following assumptions were used:
- The RC beam is analyzed as a rectangular section;
- The required flexure reinforcment `As` is calculated with the assumption of 1 layer of rebars;
- Compression reinforcement are neglected in the calculation;
- A minimum of 2 rebars or 1/2 of the corresponding opposite side of each location shall always be provided, whichever is larger; and
- The effect of slab in the compression zone is neglected.


### Shear Reinforcements:
Calculating for the required spacing of shear reniforcement, the following assumptions were used:
- The spacing of stirrups was calculated using two (2) legs
- The maximum spacing, regardless if stirrups are required or not, will be minimum of d/2 or 24 in.
- Torsional effects not considered.


## How to Use this Calculator

Step 1: Specify material strength (fy and fc) at the left menu
![Step 1](./images/2.png)

Step 2: Specify modification factors - for calculating development length
![Step 2](./images/3.png)

Step 3: Specify the rebar that you want to get the detailed calculation of the splice and development length
![Step 3](./images/4.png)

Step 4: Click Run button at the upper right part of the screen. It will automatically generate a table of splice and development lengths specific for the fy and fc values for all the rebar diameters. It will print the output for the selected rebar at the right menu.
![Step 4](./images/5.png)

## Verification

Check [verification.xlsx](./verification.xlsx) file for comparison of the calculated values with the references.

References used in verification:

- Darwin, D., Dolan, C. W., & Nilson, A. H. (2016). Design of concrete structures (Vol. 2). New York, NY, USA:: McGraw-Hill Education.
- ACI Detailing Manual MNL-66 (2020)
- Wight, J. K., & MacGregor, J. G. (2016). Reinforced concrete. Pearson Education UK.

