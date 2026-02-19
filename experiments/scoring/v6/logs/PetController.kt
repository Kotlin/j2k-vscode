
/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import java.util.Collection
import java.util.Optional

import org.springframework.stereotype.Controller
import org.springframework.ui.ModelMap
import org.springframework.util.StringUtils
import org.springframework.validation.BindingResult
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping

import jakarta.validation.Valid
import org.springframework.web.servlet.mvc.support.RedirectAttributes

/**
 * @author Juergen Hoeller
 * @author Ken Krebs
 * @author Arjen Poutsma
 * @author Wick Dynex
 */
@Controller
@RequestMapping("/owners/{ownerId}")
internal open class PetController(
    private val owners: OwnerRepository,
    private val types: PetTypeRepository
) {

    companion object {
        private const val VIEWS_PETS_CREATE_OR_UPDATE_FORM = "pets/createOrUpdatePetForm"
    }

    @ModelAttribute("types")
    fun populatePetTypes(): Collection<PetType> {
        return this.types.findPetTypes()
    }

    @ModelAttribute("owner")
    fun findOwner(@PathVariable("ownerId") ownerId: Int): Owner {
        val optionalOwner = this.owners.findById(ownerId)
        val owner = optionalOwner.orElseThrow {
            IllegalArgumentException(
                "Owner not found with id: $ownerId. Please ensure the ID is correct "
            )
        }
        return owner
    }

    @ModelAttribute("pet")
    fun findPet(
        @PathVariable("ownerId") ownerId: Int,
        @PathVariable(name = "petId", required = false) petId: Int?
    ): Pet {

        if (petId == null) {
            return Pet()
        }

        val optionalOwner = this.owners.findById(ownerId)
        val owner = optionalOwner.orElseThrow {
            IllegalArgumentException(
                "Owner not found with id: $ownerId. Please ensure the ID is correct "
            )
        }
        return owner.getPet(petId)
    }

    @InitBinder("owner")
    fun initOwnerBinder(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @InitBinder("pet")
    fun initPetBinder(dataBinder: WebDataBinder) {
        dataBinder.setValidator(PetValidator())
    }

    @GetMapping("/pets/new")
    fun initCreationForm(owner: Owner, model: ModelMap): String {
        val pet = Pet()
        owner.addPet(pet)
        return VIEWS_PETS_CREATE_OR_UPDATE_FORM
    }

    @PostMapping("/pets/new")
    fun processCreationForm(
        owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {

        if (StringUtils.hasText(pet.getName()) && pet.isNew() && owner.getPet(pet.getName(), true) != null) {
            result.rejectValue("name", "duplicate", "already exists")
        }

        val currentDate = LocalDate.now()
        if (pet.getBirthDate() != null && pet.getBirthDate().isAfter(currentDate)) {
            result.rejectValue("birthDate", "typeMismatch.birthDate")
        }

        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }

        owner.addPet(pet)
        this.owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "New Pet has been Added")
        return "redirect:/owners/{ownerId}"
    }

    @GetMapping("/pets/{petId}/edit")
    fun initUpdateForm(): String {
        return VIEWS_PETS_CREATE_OR_UPDATE_FORM
    }

    @PostMapping("/pets/{petId}/edit")
    fun processUpdateForm(
        owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {

        val petName = pet.getName()

        // checking if the pet name already exists for the owner
        if (StringUtils.hasText(petName)) {
            val existingPet = owner.getPet(petName, false)
            if (existingPet != null && existingPet.getId() != pet.getId()) {
                result.rejectValue("name", "duplicate", "already exists")
            }
        }

        val currentDate = LocalDate.now()
        if (pet.getBirthDate() != null && pet.getBirthDate().isAfter(currentDate)) {
            result.rejectValue("birthDate", "typeMismatch.birthDate")
        }

        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }

        updatePetDetails(owner, pet)
        redirectAttributes.addFlashAttribute("message", "Pet details has been edited")
        return "redirect:/owners/{ownerId}"
    }

    /**
     * Updates the pet details if it exists or adds a new pet to the owner.
     * @param owner The owner of the pet
     * @param pet The pet with updated details
     */
    private fun updatePetDetails(owner: Owner, pet: Pet) {
        val existingPet = owner.getPet(pet.getId())
        if (existingPet != null) {
            // Update existing pet's properties
            existingPet.setName(pet.getName())
            existingPet.setBirthDate(pet.getBirthDate())
            existingPet.setType(pet.getType())
        } else {
            owner.addPet(pet)
        }
        this.owners.save(owner)
    }

}
