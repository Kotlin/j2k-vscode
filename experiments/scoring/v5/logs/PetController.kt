
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

@Controller
@RequestMapping("/owners/{ownerId}")
open class PetController(
    private val owners: OwnerRepository,
    private val types: PetTypeRepository
) {

    companion object {
        const val VIEWS_PETS_CREATE_OR_UPDATE_FORM = "pets/createOrUpdatePetForm"
    }

    @ModelAttribute("types")
    fun populatePetTypes(): MutableCollection<PetType> {
        return types.findPetTypes()
    }

    @ModelAttribute("owner")
    fun findOwner(@PathVariable("ownerId") ownerId: Int): Owner {
        return owners.findById(ownerId).orElseThrow {
            IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ")
        }
    }

    @ModelAttribute("pet")
    fun findPet(
        @PathVariable("ownerId") ownerId: Int,
        @PathVariable(name = "petId", required = false) petId: Int?
    ): Pet {
        if (petId == null) return Pet()
        val owner = owners.findById(ownerId).orElseThrow {
            IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ")
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
        owner.addPet(Pet())
        return VIEWS_PETS_CREATE_OR_UPDATE_FORM
    }

    @PostMapping("/pets/new")
    fun processCreationForm(
        owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        if (StringUtils.hasText(pet.getName()) && pet.isNew() && owner.getPet(pet.getName(), true) != null)
            result.rejectValue("name", "duplicate", "already exists")

        pet.getBirthDate()?.let { birthDate ->
            if (birthDate.isAfter(LocalDate.now())) {
                result.rejectValue("birthDate", "typeMismatch.birthDate")
            }
        }

        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }

        owner.addPet(pet)
        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "New Pet has been Added")
        return "redirect:/owners/{ownerId}"
    }

    @GetMapping("/pets/{petId}/edit")
    fun initUpdateForm(): String = VIEWS_PETS_CREATE_OR_UPDATE_FORM

    @PostMapping("/pets/{petId}/edit")
    fun processUpdateForm(
        owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        val petName = pet.getName()

        if (StringUtils.hasText(petName)) {
            val existingPet = owner.getPet(petName, false)
            if (existingPet != null && existingPet.getId() != pet.getId()) {
                result.rejectValue("name", "duplicate", "already exists")
            }
        }

        pet.getBirthDate()?.let { birthDate ->
            if (birthDate.isAfter(LocalDate.now())) {
                result.rejectValue("birthDate", "typeMismatch.birthDate")
            }
        }

        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }

        updatePetDetails(owner, pet)
        redirectAttributes.addFlashAttribute("message", "Pet details has been edited")
        return "redirect:/owners/{ownerId}"
    }

    private fun updatePetDetails(owner: Owner, pet: Pet) {
        val existingPet = owner.getPet(pet.getId())
        if (existingPet != null) {
            existingPet.setName(pet.getName())
            existingPet.setBirthDate(pet.getBirthDate())
            existingPet.setType(pet.getType())
        } else {
            owner.addPet(pet)
        }
        owners.save(owner)
    }
}
